import {
  DOMAIN,
  HOMEPAGE_ITEMS_PER_PAGE,
  MAX_COMMENT_DEPTH,
  PROTOCOL,
} from "../config.js";
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
  MAX_COMMENT_DEPTH_ERROR,
  MULTIPLE_EDIT_ERROR,
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  PERMISSION_ENTITY_LOCKED_ERROR,
  PERMISSION_USER_BANNED_ERROR,
  POSTGRES_ERROR,
  USER_ID_MISMATCH_ERROR,
} from "./errors.js";
import { dbQueueNotification } from "./notifications.js";
import {
  dbGetPost,
  dbPostCommentable,
  dbQueuePostReplyNotification,
} from "./posts.js";
import { dbGetUser, dbUserActive } from "./users.js";
import { dbRegisterCommentVote } from "./votes.js";

export const dbGetCommentsForPost = async (postID, page, userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    let offset;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    validateArgument("page", postID, [paramArgumentNumber]);
    if (page === undefined) offset = 0;
    offset = HOMEPAGE_ITEMS_PER_PAGE * Math.floor(page ?? 0);
    const userIDParam = userID === undefined ? [] : [userID];
    try {
      const commentsQuery = await client.query({
        name: "post_comments_query",
        text: `
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
            order by comment_deleted desc, comment_votes desc, comment_timestamp desc
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
            order by comment_deleted desc, comment_votes desc, comment_timestamp desc
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
      `,
        values: [postID, userID, HOMEPAGE_ITEMS_PER_PAGE, offset],
      });
      return commentsQuery.rows;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCommentVotable = async (commentID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("commentID", commentID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    try {
      const commentQuery = await client.query(
        "select comment_id from comments where comment_id = $1 and (comment_deleted = FALSE or comment_deleted is NULL)",
        [commentID],
      );
      if (commentQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetComment = async (commentID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("commentID", commentID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    try {
      const commentQuery = await client.query(
        "select * from comments where comment_id = $1",
        [commentID],
      );
      return commentQuery.rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbEditComment = async (userID, commentID, content) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("content", content, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("commentID", commentID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    const existingComment = await dbGetComment(commentID);
    if (
      existingComment === undefined ||
      existingComment.comment_deleted === true
    )
      throw PERMISSION_ENTITY_DELETED_ERROR("comment", commentID);
    if (existingComment.comment_locked !== null)
      throw PERMISSION_ENTITY_LOCKED_ERROR("comment", commentID);
    if (existingComment.user_id !== userID)
      throw USER_ID_MISMATCH_ERROR(userID);
    if (existingComment.comment_edited_at !== null) throw MULTIPLE_EDIT_ERROR;
    const existingPostID = existingComment.post_id;
    if (!(await dbPostCommentable(existingPostID)))
      throw PERMISSION_ENTITY_LOCKED_ERROR("post", postID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      await client.query(
        `
        update
          comments
        set
          comment_content = $1,
          comment_edited_at = NOW()
        where comment_id = $2
      `,
        [content, commentID],
      );
      return true;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbDeleteComment = async (userID, commentID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("commentID", commentID, [paramArgumentNonNull]);
    const existingComment = await dbGetComment(commentID);
    if (
      existingComment === undefined ||
      existingComment.comment_deleted === true
    )
      throw PERMISSION_ENTITY_DELETED_ERROR("comment", commentID);
    if (existingComment.user_id !== userID)
      throw USER_ID_MISMATCH_ERROR(userID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      await client.query(
        `
        update
          comments
        set
          comment_content = '[deleted by user]',
          comment_deleted = TRUE,
          comment_deletion_reason = 'deleted by user',
          user_id = NULL
        where comment_id = $1
      `,
        [commentID],
      );
      return true;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCreateComment = async (userID, postID, comment) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("comment", comment, [
      paramArgumentNonNull,
      paramArgumentObject,
    ]);
    validateArgument("comment.replyTo", comment.replyTo, [paramArgumentNumber]);
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    validateArgument("comment.content", comment.content, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    if (!(await dbPostCommentable(postID)))
      throw PERMISSION_ENTITY_LOCKED_ERROR("post", postID);
    let replyTo = null,
      root = null,
      chainDepth = 0;
    if (comment.replyTo !== undefined) {
      const parentComment = await dbGetComment(comment.replyTo);
      if (parentComment === undefined || parentComment.comment_deleted === true)
        throw PERMISSION_ENTITY_DELETED_ERROR("comment", comment.replyTo);
      if (parentComment.comment_locked === true)
        throw PERMISSION_ENTITY_LOCKED_ERROR("comment", comment.replyTo);
      if (parentComment.comment_chain_depth >= MAX_COMMENT_DEPTH)
        throw MAX_COMMENT_DEPTH_ERROR;
      replyTo = comment.replyTo;
      chainDepth = parentComment.comment_chain_depth + 1;
      root = parentComment.comment_id;
      if (parentComment.comment_root !== null)
        root = parentComment.comment_root;
    }
    try {
      const commentQuery = await client.query(
          `insert into
            comments(
              post_id,
              user_id,
              comment_replyto,
              comment_content,
              comment_chain_depth,
              comment_root,
              comment_timestamp,
              comment_votes
            ) values($1, $2, $3, $4, $5, $6, now(), 0) returning *`,
          [postID, userID, replyTo, comment.content, chainDepth, root],
        ),
        commentID = commentQuery.rows[0].comment_id,
        returnedComment = { ...commentQuery.rows[0] };
      dbRegisterCommentVote(userID, commentID, 1).catch((err) =>
        console.error(err),
      );
      returnedComment.comment_votes = 1;
      if (replyTo !== null) {
        dbQueueCommentReplyNotification(postID, replyTo, comment, userID);
      } else {
        dbQueuePostReplyNotification(postID, comment, userID);
      }
      return returnedComment;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbQueueCommentReplyNotification = async (
    postID,
    parentCommentID,
    comment,
    userID,
  ) => {
    const parentComment = await dbGetComment(parentCommentID),
      post = await dbGetPost(postID),
      parentCommentUserID = parentComment.user_id,
      childCommentUserID = userID,
      childCommentUser = await dbGetUser(childCommentUserID),
      childCommentUsername = childCommentUser.user_username,
      childCommentDisplayName = childCommentUser.user_displayname;
    console.log("queuing e-mail", parentCommentUserID, childCommentUserID);
    if (parentCommentUserID === childCommentUserID) return;
    dbQueueNotification(parentCommentUserID, "comment_reply", {
      header: `A reply has been made to your comment on "${post.post_title}"`,
      body: `User ${san(childCommentDisplayName)} <${san(childCommentUsername)}> has replied:

> ${san(comment.content).split(/\r|\n/g).join("\t\n> ")}

See more at ${PROTOCOL}://${DOMAIN}/posts/${postID}`,
      bodyHTML: `
  <h1>A reply has been made to your comment on "${san(post.post_title)}"</h1>
  <p>User ${san(childCommentDisplayName)} &lt;${san(childCommentUsername)}&gt; has replied:</p>
  <p style='font-family: monospace; margin-left: 1em;'>
  &gt; ${san(comment.content).split(/\r|\n/g).join("<br/>&gt; ")}
  </p>
  <p><i>See more at <a href="${PROTOCOL}://${DOMAIN}/posts/${postID}">/posts/${postID}</a></i></p>
`,
    });
  };
