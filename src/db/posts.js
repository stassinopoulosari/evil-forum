import { DOMAIN, PROTOCOL } from "../config.js";
import {
  client,
  paramArgumentNonNull,
  paramArgumentNumber,
  paramArgumentObject,
  paramArgumentString,
  paramArgumentStringNotBlank,
  san,
  validateArgument,
} from "./db.js";
import {
  LINK_POST_EDIT_ERROR,
  MALFORMED_PARAMETER_ERROR,
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  PERMISSION_ENTITY_LOCKED_ERROR,
  PERMISSION_USER_BANNED_ERROR,
  POSTGRES_ERROR,
  USER_ID_MISMATCH_ERROR,
} from "./errors.js";
import { dbQueueNotification } from "./notifications.js";
import { dbCalculateScoreForPost } from "./scores.js";
import { dbGetUser, dbUserActive } from "./users.js";
import { dbRegisterPostVote } from "./votes.js";
import sanitizeHtml from "sanitize-html";

export const dbCreatePost = async (userID, post) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("post", post, [paramArgumentNonNull, paramArgumentObject]);
    validateArgument("post.title", post.title, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("post.text", post.text, [paramArgumentStringNotBlank]);
    validateArgument("post.link", post.link, [paramArgumentStringNotBlank]);
    if (
      (post.text === undefined && post.link === undefined) ||
      (post.text !== undefined && post.link !== undefined)
    ) {
      throw MALFORMED_PARAMETER_ERROR("post", post);
    }
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      let postQuery;
      if (post.link !== undefined) {
        postQuery = await client.query(
          "insert into posts (user_id, post_title, post_timestamp, post_link, post_votes) values ($1, $2, now(), $3, 0) returning *;",
          [userID, post.title, post.link],
        );
      } else if (post.text !== undefined) {
        postQuery = await client.query(
          "insert into posts (user_id, post_title, post_timestamp, post_text, post_votes) values ($1, $2, now(), $3, 0) returning *;",
          [userID, post.title, post.text],
        );
      }
      const postID = postQuery.rows[0].post_id,
        returnedPost = { ...postQuery.rows[0] };
      dbRegisterPostVote(userID, postID, 1)
        .then(() => {
          dbCalculateScoreForPost(postID);
        })
        .catch((err) => console.error(err));

      returnedPost.post_votes = 1;
      return returnedPost;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbEditPost = async (userID, postID, text) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    validateArgument("text", text, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);

    const existingPost = await dbGetPost(postID);
    if (existingPost === undefined)
      throw PERMISSION_ENTITY_DELETED_ERROR("post", postID);
    if (existingPost.post_locked !== null)
      throw PERMISSION_ENTITY_LOCKED_ERROR("post", postID);
    if (existingPost.user_id !== userID) throw USER_ID_MISMATCH_ERROR(userID);
    if (existingPost.post_edited_at !== null) throw MULTIPLE_EDIT_ERROR;
    if (!(await dbPostCommentable(existingPost)))
      throw PERMISSION_ENTITY_LOCKED_ERROR("post", postID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    if (existingPost.post_link !== null) throw LINK_POST_EDIT_ERROR;
    try {
      await client.query(
        `
        update
          posts
        set
          post_text = $1,
          post_edited_at = NOW()
        where post_id = $2
      `,
        [text, postID],
      );
      return true;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbDeletePost = async (userID, postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    const existingPost = await dbGetPost(postID);
    if (existingPost === undefined || existingPost.post_deleted === true)
      throw PERMISSION_ENTITY_DELETED_ERROR("post", postID);
    console.log(existingPost.user_id, userID);
    if (existingPost.user_id !== userID) throw USER_ID_MISMATCH_ERROR(userID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      await client.query(
        `
        update
          posts
        set
          post_link = NULL,
          post_text = '[deleted by user]',
          post_deleted = TRUE,
          post_deletion_reason = 'deleted by user',
          user_id = NULL,
          post_score = 0
        where post_id = $1
      `,
        [postID],
      );
      return true;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetPost = async (postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);

    try {
      const postQuery = await client.query(
        "select * from posts where post_id = $1 limit 1",
        [postID],
      );
      return postQuery.rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetPostWithUserInformation = async (postID, userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    let postQuery;
    try {
      postQuery = await client.query(
        `select
          posts.post_id as post_id,
          post_title,
          post_timestamp,
          post_text,
          post_link,
          post_votes,
          post_score,
          post_locked,
          post_edited_at,
          user_displayname,
          post_deleted,
          user_username
          ${userID === undefined ? "" : `, vote_positive, case when posts.user_id = $2 then TRUE else FALSE end as post_mine`}
        from
          posts
          left join users on posts.user_id = users.user_id
          ${
            userID !== undefined
              ? `
              left join post_votes on posts.post_id = post_votes.post_id and post_votes.user_id = $2
              `
              : ""
          }
        where posts.post_id = $1 limit 1;`,
        [postID, ...(userID === undefined ? [] : [userID])],
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
    if (postQuery.rows.length === 0)
      throw PERMISSION_ENTITY_DELETED_ERROR("post", postID);
    return postQuery.rows[0];
  },
  dbPostVotable = async (postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    try {
      const postQuery = await client.query(
        "select post_id from posts where post_id = $1 and (post_deleted = FALSE or post_deleted is NULL)",
        [postID],
      );
      if (postQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbPostCommentable = async (postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    try {
      const postQuery = await client.query(
        "select post_id from posts where post_id = $1 and (post_deleted = FALSE or post_deleted is NULL) and (post_locked = FALSE or post_locked is NULL)",
        [postID],
      );
      if (postQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbQueuePostReplyNotification = async (postID, comment, userID) => {
    const post = await dbGetPost(postID),
      postUserID = post.user_id,
      childCommentUserID = userID,
      childCommentUser = await dbGetUser(childCommentUserID),
      childCommentUsername = childCommentUser.user_username,
      childCommentDisplayName = childCommentUser.user_displayname;
    if (postUserID === childCommentUserID) return;
    dbQueueNotification(postUserID, "comment_reply", {
      header: `A reply has been made to your post "${post.post_title}"`,
      body: `User ${san(childCommentDisplayName)} <${san(childCommentUsername)}> has replied:

\t> ${san(comment.content).split(/\r|\n/g).join("\t\n> ")}

See more at ${PROTOCOL}://${DOMAIN}/posts/${postID}`,
      bodyHTML: `
<h1>A reply has been made to your post "${san(post.post_title)}"</h1>
<p>User ${san(childCommentDisplayName)} <${san(childCommentUsername)}> has replied:</p>
<p style='font-family: monospace; margin-left: 1em;'>
&gt; ${san(comment.content).split(/\r|\n/g).join("<br/>&gt; ")}
</p>
<p><i>See more at <a href="${PROTOCOL}://${DOMAIN}/posts/${postID}">/posts/${postID}</a></i></p>
`,
    });
  };
