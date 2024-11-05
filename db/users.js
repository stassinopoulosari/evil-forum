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
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  POSTGRES_ERROR,
} from "./errors.js";

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
  dbCreateUser = async (username, displayName, googleID) => {
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
    try {
      const duplicateUsernameRows = await client.query(
        "select * from users where user_username = $1 or user_google_id = $2",
        [username, googleID],
      );
      if (duplicateUsernameRows.rows.length !== 0) {
        throw "User already exists";
      }
      const newUser = await client.query(
        "insert into users (user_id, user_username, user_displayname, user_google_id) values(gen_random_uuid(), $1, $2, $3) returning *;",
        [username, displayName, googleID],
      );
      return newUser.rows[0].user_id;
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
    try {
      const userIDQuery = await client.query(
        "select user_id from users where user_username = $1 limit 1",
      );
      if (userIDQuery.rows.length === 0)
        throw PERMISSION_ENTITY_DELETED_ERROR("user", username);
      return await dbGetUser(userIDQuery.rows[0].user_id, requestorUserID);
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
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
  dbGetUserContent = async (username, requestorUserID, page) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("requestorUserID", requestorUserID, [paramArgumentString]);
    validateArgument("page", page, [paramArgumentNumber]);
    let offset;
    if (page === undefined) offset = 0;
    offset = HOMEPAGE_ITEMS_PER_PAGE * Math.floor(page ?? 0);
    try {
      return (
        await client.query(
          `select
        coalesce(comments.post_id, posts.post_id) as post_id,
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
        comment_replyto,
        comment_root,
        comment_votes,
        comment_content,
        comment_timestamp,
        comment_locked,
        coalesce(post_timestamp, comment_timestamp) as timestamp,
        case
          when posts.post_id is not null then 'post'
          when comments.comment_id is not null then 'comment'
        else
          NULL
        end as entity_type,
        case
          when posts.post_id is not null and posts.user_id = $2 then TRUE
          when posts.post_id is null then NULL
          else
            false
        end as post_mine,
        case
          when comments.comment_id is not null and comments.user_id = $2 then TRUE
          when comments.comment_id is null then NULL
          else
            false
        end as comment_mine
      from
        posts
        full outer join
          comments on FALSE
        left join
          users on
            users.user_id = coalesce(posts.user_id, comments.user_id)
        where
          user_username = $1
        order by
          timestamp desc
        limit $3
        offset $4;`,
          [username, requestorUserID, HOMEPAGE_ITEMS_PER_PAGE, offset],
        )
      ).rows;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
