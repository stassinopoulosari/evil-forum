import { HOMEPAGE_ITEMS_PER_PAGE } from "../config.js";
import {
  client,
  paramArgumentNonNull,
  paramArgumentNumber,
  paramArgumentString,
  paramArgumentStringNotBlank,
  validateArgument,
} from "./db.js";
import {
  DUPLICATE_USER_ERROR,
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  PERMISSION_USER_BANNED_ERROR,
  POSTGRES_ERROR,
} from "./errors.js";
import { dbUpdateNotificationSettings } from "./notifications.js";

export const dbUserActive = async (userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const userQuery = await client.query(
        "select user_id from users where user_id = $1 and (user_banned = FALSE or user_banned is NULL)",
        [userID],
      );
      if (userQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbUserActiveByUsername = async (username) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const userQuery = await client.query(
        "select user_id from users where user_username = $1 and (user_banned = FALSE or user_banned is NULL)",
        [username],
      );
      if (userQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCreateUser = async (username, displayName, googleID, email) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("displayName", displayName, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("googleID", googleID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("email", email, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    let duplicateUsernameRows;
    try {
      duplicateUsernameRows = await client.query(
        "select * from users where user_username = $1 or user_google_id = $2",
        [username, googleID],
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
    if (duplicateUsernameRows.rows.length !== 0) {
      throw DUPLICATE_USER_ERROR;
    }
    try {
      const newUser = await client.query(
        "insert into users (user_id, user_username, user_displayname, user_google_id, user_email) values(gen_random_uuid(), $1, $2, $3, $4) returning *;",
        [username, displayName, googleID, email],
      );
      const userID = newUser.rows[0].user_id;
      dbUpdateNotificationSettings(userID, {
        notification_comment_reply: true,
        notification_post_reply: true,
      });
      return userID;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUser = async (userID, requestorUserID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      let fields = ["user_username", "user_displayname"];
      if (userID === requestorUserID) {
        fields.push("user_banned");
        fields.push("user_email");
        fields.push("TRUE as user_me");
      }
      return (
        await client.query(
          `
        select ${fields.join(", ")}
        from users
        where user_id = $1 limit 1
        `,
          [userID],
        )
      ).rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUserByUsername = async (username, requestorUserID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    const userID = await dbGetUserIDByUsername(username);
    try {
      return await dbGetUser(userID, requestorUserID);
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUserIDByUsername = async (username) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    let userIDQuery;
    try {
      userIDQuery = await client.query(
        "select user_id from users where user_username = $1 limit 1",
        [username],
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
    if (userIDQuery.rows.length === 0)
      throw PERMISSION_ENTITY_DELETED_ERROR("user", username);
    return userIDQuery.rows[0].user_id;
  },
  dbGetUserByGoogleID = async (googleID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const userQuery = await client.query(
        "select * from users where user_google_id = $1",
        [googleID],
      );
      if (userQuery.rows.length !== 1) {
        return undefined;
      }
      return userQuery.rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbDeleteUser = async (userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      return await client.query(
        `
        -- delete comments
        with delete_comments as (
        update comments set user_id = NULL, comment_deleted = TRUE, comment_deletion_reason = 'user deleted account' where user_id = $1
        ),
        -- delete posts
        delete_posts as (
        update posts set user_id = NULL, post_deleted = TRUE, post_deletion_reason = 'user deleted account' where user_id = $1
        )
        -- delete sessions
        delete from user_sessions where session_user_id = $1;
        -- set displayname and username. ban user
        update users set user_username = user_username || '.deleted',
        user_displayname = '[deleted]', user_email = 'void@ari-s.com',
        user_google_id = '',
        user_banned = TRUE
        where user_id = $1;
        `,
        [userID],
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUserContent = async (username, requestorUserID, page) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("requestorUserID", requestorUserID, [paramArgumentString]);
    validateArgument("page", page, [paramArgumentNumber]);
    const offset = HOMEPAGE_ITEMS_PER_PAGE * Math.floor(page ?? 0),
      userID = await dbGetUserIDByUsername(username);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      return (
        await client.query(
          `
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
              join users
                on comments.user_id = users.user_id
              left join (select comment_id, vote_positive from comment_votes where user_id = $2) requestor_comment_votes
                on requestor_comment_votes.comment_id = comments.comment_id
              where users.user_id = $1
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
            offset $4;`,
          [userID, requestorUserID, HOMEPAGE_ITEMS_PER_PAGE, offset],
        )
      ).rows;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
