import Pool from "pg";
import { PROTOCOL, SECRETS } from "../config.js";
import { MALFORMED_PARAMETER_ERROR } from "./errors.js";
import session from "express-session";
import store from "connect-pg-simple";
import sanitizeHtml from "sanitize-html";
const pool = new Pool.Pool({
  connectionString: SECRETS.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export let client = undefined;

const PGSession = store(session);

const sessionStore = new PGSession({
  pool: pool,
  tableName: "express_sessions",
});

export const dbSession = session({
    store: sessionStore,
    secret: SECRETS.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  }),
  setupDB = async () => {
    if (client === undefined) {
      throw NO_CLIENT_ERROR;
    }
    try {
      return await client.query(`
    create extension pgcrypto;
    create table "users"(
      user_id uuid primary key,
      user_email text,
      user_google_id text not null,
      user_username text unique not null,
      user_displayname text not null,
      user_banned boolean
    );
    create table "posts"(
      post_id serial primary key,
      user_id uuid references users(user_id),
      post_title text not null,
      post_timestamp timestamptz not null,
      post_text text,
      post_link text,
      post_votes integer,
      post_score numeric(10,6),
      post_locked boolean,
      post_deleted boolean,
      post_deletion_reason text,
      post_edited_at timestamptz
    );
    create table "comments"(
      comment_id serial primary key,
      post_id integer references posts(post_id) not null,
      user_id uuid references users(user_id),
      comment_replyto integer references comments(comment_id),
      comment_root integer references comments(comment_id),
      comment_votes integer,
      comment_chain_depth integer,
      comment_content text not null,
      comment_timestamp timestamptz not null,
      comment_locked boolean,
      comment_deleted boolean,
      comment_deletion_reason text,
      comment_edited_at timestamptz
    );
    create table "comment_votes"(
      vote_id text primary key,
      comment_id integer references comments(comment_id) not null,
      user_id uuid references users(user_id) not null,
      vote_positive boolean not null
    );
    create table "post_votes"(
      vote_id text primary key,
      post_id integer references posts(post_id) not null,
      user_id uuid references users(user_id) not null,
      vote_positive boolean not null
    );
    create table "user_sessions"(
      session_id uuid primary key,
      user_id uuid references users(user_id) not null,
      session_expires timestamptz not null,
      session_opened timestamptz not null,
      session_ip text not null
    );
    create table "queued_notifications"(
      notification_id serial primary key,
      user_id uuid references users(user_id) not null,
      notification_type text not null,
      notification_information json not null,
      notification_queued timestamptz not null
    );
    create table "user_notification_settings"(
      user_id uuid references users(user_id) unique not null,
      notification_post_reply boolean,
      notification_comment_reply boolean
    );
    -- From connect-pg-simple middleware
    create table "express_sessions" (
      "sid" varchar not null collate "default",
      "sess" json not null,
      "expire" timestamp(6) not null
    )
    with (oids = FALSE);
    alter table "express_sessions" add constraint "express_sessions_pkey" primary key ("sid") not deferrable initially immediate;
    create index "IDX_express_sessions_expire" on "express_sessions" ("expire");
    prepare get_user_content(uuid, uuid, integer, integer) as
      with comments_with_context as (
        select
          posts.post_title as comment_post_title,
          vote_positive,
          comments.comment_id,
          comments.user_id as user_id,
          comment_replyto,
          comment_root,
          comment_votes,
          comment_content,
          comment_timestamp,
          comment_edited_at,
          comment_locked,
          posts.post_id as post_id
        from
          comments
          join posts
            on comments.post_id = posts.post_id
          left join (select comment_id, vote_positive from comment_votes where user_id = $2) requestor_comment_votes
            on requestor_comment_votes.comment_id = comments.comment_id
          where comments.user_id = $1
      ),
      posts_with_context as (
        select
          posts.post_id,
          post_title,
          post_timestamp,
          post_text,
          post_link,
          post_votes,
          post_score,
          post_locked,
          post_edited_at,
          vote_positive,
          posts.user_id as user_id
        from posts
        left join (select post_id, vote_positive from post_votes where user_id = $2) requestor_post_votes on
          requestor_post_votes.post_id = posts.post_id
        where posts.user_id = $1
      )
      select
        coalesce(comments_with_context.post_id, posts_with_context.post_id) as post_id,
        post_title,
        post_timestamp,
        post_text,
        post_link,
        post_votes,
        post_score,
        post_locked,
        post_edited_at,
        user_displayname,
        user_username,
        comment_id,
        comment_post_title,
        comment_edited_at,
        comment_replyto,
        comment_root,
        comment_votes,
        comment_content,
        comment_timestamp,
        comment_locked,
        coalesce(posts_with_context.vote_positive, comments_with_context.vote_positive) as vote_positive,
        coalesce(post_timestamp, comment_timestamp) as timestamp,
        case
          when posts_with_context.post_id is not null then 'post'
          when comments_with_context.comment_id is not null then 'comment'
        else
          NULL
        end as entity_type,
        case
          when posts_with_context.post_id is not null and posts_with_context.user_id = $2 then TRUE
          when posts_with_context.post_id is null then NULL
          else
            false
        end as post_mine,
        case
          when comments_with_context.comment_id is not null and comments_with_context.user_id = $2 then TRUE
          when comments_with_context.comment_id is null then NULL
          else
            false
        end as comment_mine
      from
      posts_with_context
        full outer join
          comments_with_context on FALSE
        left join
          users on
            users.user_id = coalesce(posts_with_context.user_id, comments_with_context.user_id)
        where
          users.user_id = $1
        order by
          timestamp desc
        limit $3
        offset $4;
    prepare get_homepage(uuid, integer, integer) as
      with my_posts as (select post_id, TRUE as post_mine from posts where post_score != 0 and user_id = $1)
      select
        posts.post_id as post_id,
        post_title,
        post_timestamp,
        post_text,
        post_link,
        post_votes,
        post_score,
        post_deleted,
        post_locked,
        post_edited_at,
        user_displayname,
        user_username,
        vote_positive,
        coalesce(my_posts.post_mine, FALSE) as post_mine
      from
        posts
        left join users on posts.user_id = users.user_id
        left join post_votes on posts.post_id = post_votes.post_id and post_votes.user_id = $1
        left join my_posts on posts.post_id = my_posts.post_id
      where post_score != 0 order by post_score desc, post_timestamp, post_id desc limit $2 offset $3;
    prepare get_comments_for_post(integer, uuid, integer, integer) as
      with
        all_comments_for_post as (
          select
            comment_id,
            post_id,
            user_id,
            comment_replyto,
            comment_root,
            comment_votes,
            comment_content,
            comment_timestamp,
            comment_edited_at,
            comment_locked,
            comment_deleted,
            comment_deletion_reason,
            comment_chain_depth
          from comments where post_id = $1
        ),
        first_level_comments_for_post as (
          select
            *
          from all_comments_for_post where comment_chain_depth = 0
          order by comment_votes desc, comment_timestamp desc
            limit $3 offset $4
        ),
        first_level_comment_ids as (
          select comment_id as root_id from first_level_comments_for_post
        ),
        children_of_first_level_comments as (
          select
            comment_id,
            post_id,
            user_id,
            comment_replyto,
            all_comments_for_post.comment_root,
            comment_votes,
            comment_content,
            comment_timestamp,
            comment_edited_at,
            comment_locked,
            comment_deleted,
            comment_deletion_reason,
            comment_chain_depth
          from
            all_comments_for_post
            inner join first_level_comment_ids
              on first_level_comment_ids.root_id = all_comments_for_post.comment_root
          where
            comment_chain_depth != 0
          order by comment_votes desc, comment_timestamp desc
        ),
        all_returned_comments as (
          select * from first_level_comments_for_post
          union all
          select * from children_of_first_level_comments
        )
        select
          all_returned_comments.comment_id as comment_id,
          post_id,
          user_username,
          user_displayname,
          comment_replyto,
          comment_root,
          comment_edited_at,
          comment_votes,
          comment_content,
          comment_deleted,
          comment_timestamp,
          comment_locked,
          comment_chain_depth,
          vote_positive,
          case
            when all_returned_comments.user_id = $2 then TRUE
            else FALSE
          end as comment_mine
        from
          all_returned_comments
          left join users on all_returned_comments.user_id = users.user_id
          left join comment_votes on all_returned_comments.comment_id = comment_votes.comment_id and comment_votes.user_id = $2;
    prepare total_post_votes_on_interval(timestamptz, timestamptz) as
      /* Select posts on the given time interval */
      with selected_post_ids as (select post_id as selected_id from posts where post_timestamp >= $1 and post_timestamp <= $2),
      /* Select the votes from said posts */
      selected_post_votes as (select post_id, vote_positive from post_votes join selected_post_ids on post_id=selected_id),
      /* Split into the positive and negative votes */
      selected_positive_votes as (select * from selected_post_votes where vote_positive = TRUE),
      selected_negative_votes as (select * from selected_post_votes where vote_positive = FALSE),
      /* Count the total votes per post for both positive and negative */
      selected_positive_vote_totals as (
        select post_id as positive_post_id, count(*) as positive_count
        from selected_positive_votes
        group by positive_post_id
      ),
      selected_negative_vote_totals as (
        select post_id as negative_post_id, count(*) as negative_count
        from selected_negative_votes
        group by negative_post_id
      ),
      /* Take the totals per post */
      selected_vote_combined_totals as (
        select * from selected_positive_vote_totals
        full outer join selected_negative_vote_totals
        on positive_post_id=negative_post_id
      ),
      /* Subtract negative from positive votes */
      new_vote_totals as (
        select
          /* If you don't do this, one may be null */
          coalesce(positive_post_id, negative_post_id) as post_id,
          /* It turns out if one of these is null, this will return null (ask me how I know()) */
          (coalesce(positive_count,0) - coalesce(negative_count, 0)) as votes
        from selected_vote_combined_totals
      )
      update posts set post_votes = new_vote_totals.votes from new_vote_totals where posts.post_id = new_vote_totals.post_id;
    prepare total_comment_votes_on_interval(timestamptz, timestamptz) as /* Select comments on the given time interval */
    with selected_comment_ids as (select comment_id as selected_id from comments where comment_timestamp >= $1 and comment_timestamp <= $2),
    /* Select the votes from said comments */
    selected_comment_votes as (select comment_id, vote_positive from comment_votes join selected_comment_ids on comment_id=selected_id),
    /* Split into the positive and negative votes */
    selected_positive_votes as (select * from selected_comment_votes where vote_positive = TRUE),
    selected_negative_votes as (select * from selected_comment_votes where vote_positive = FALSE),
    /* Count the total votes per comment for both positive and negative */
    selected_positive_vote_totals as (
      select comment_id as positive_comment_id, count(*) as positive_count
      from selected_positive_votes
      group by positive_comment_id
    ),
    selected_negative_vote_totals as (
      select comment_id as negative_comment_id, count(*) as negative_count
      from selected_negative_votes
      group by negative_comment_id
    ),
    /* Take the totals per comment */
    selected_vote_combined_totals as (
      select * from selected_positive_vote_totals
      full outer join selected_negative_vote_totals
      on positive_comment_id=negative_comment_id
    ),
    /* Subtract negative from positive votes */
    new_vote_totals as (
      select
        /* If you don't do this, one may be null */
        coalesce(positive_comment_id, negative_comment_id) as comment_id,
        /* It turns out if one of these is null, this will return null (ask me how I know()) */
        (coalesce(positive_count,0) - coalesce(negative_count, 0)) as votes
      from selected_vote_combined_totals
    )
    update comments set comment_votes = new_vote_totals.votes from new_vote_totals where comments.comment_id = new_vote_totals.comment_id;
    `);
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  validateArgument = (argumentName, argument, parameters) => {
    parameters.map((parameter) => parameter(argumentName, argument));
  },
  paramArgumentNonNull = (argumentName, argument) => {
    if (argument === null || argument === undefined)
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentNumber = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      (typeof argument !== "number" || isNaN(argument))
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentObject = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      typeof argument !== "object"
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentString = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      typeof argument !== "string"
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentStringNotBlank = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      (typeof argument !== "string" || argument.trim().length <= 0)
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentBoolean = (argumentName, argument) => {
    if (argument !== undefined && ![true, false].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentValidVote = (argumentName, argument) => {
    if (![-1, 0, 1].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentValidNotificationType = (argumentName, argument) => {
    if (!["post_reply", "comment_reply"].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  san = (text) =>
    sanitizeHtml(text, { allowedTags: [], allowedAttributes: [] });

try {
  client = await pool.connect();
  try {
    console.log("Attempting DB setup");
    await setupDB();
    console.log("DB setup complete.");
  } catch (err) {
    console.log("DB already set up");
  }
} catch (err) {
  console.error(err);
}
