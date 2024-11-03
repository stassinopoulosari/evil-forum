import { dbCommentVotable } from "./comments.js";
import {
  client,
  paramArgumentNonNull,
  paramArgumentNumber,
  paramArgumentString,
  paramArgumentValidVote,
  validateArgument,
} from "./db.js";
import {
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  PERMISSION_USER_BANNED_ERROR,
  POSTGRES_ERROR,
} from "./errors.js";
import { dbPostVotable } from "./posts.js";
import { dbUserActive } from "./users.js";

export const dbRegisterPostVote = async (userID, postID, voteValue) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("voteValue", voteValue, [paramArgumentValidVote]);
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    if (!(await dbPostVotable(postID)))
      throw PERMISSION_ENTITY_DELETED_ERROR("post", postID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    const voteID = `${userID}.${postID}`;
    try {
      let previousUserVote, totalQuery;
      const previousVoteQuery = await client.query(
        "select vote_positive from post_votes where vote_id=$1",
        [voteID],
      );
      if (previousVoteQuery.rows.length === 0) {
        previousUserVote = 0;
      } else if (previousVoteQuery.rows[0].vote_positive) {
        previousUserVote = 1;
      } else {
        previousUserVote = -1;
      }
      const voteDifference = voteValue - previousUserVote;
      if (voteValue === 0) {
        await client.query("delete from post_votes where vote_id = $1", [
          voteID,
        ]);
      } else if (voteValue === 1) {
        await client.query(
          "insert into post_votes(vote_id, user_id, post_id, vote_positive) values($1, $2, $3, TRUE) on conflict (vote_id) do update set vote_positive = TRUE",
          [voteID, userID, postID],
        );
      } else {
        await client.query(
          "insert into post_votes(vote_id, user_id, post_id, vote_positive) values($1, $2, $3, FALSE) on conflict (vote_id) do update set vote_positive = FALSE",
          [voteID, userID, postID],
        );
      }
      totalQuery = await client.query(
        "update posts set post_votes = post_votes + $1 where post_id = $2 returning post_votes",
        [voteDifference, postID],
      );
      return totalQuery.rows[0].post_votes;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbRegisterCommentVote = async (userID, commentID, voteValue) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("voteValue", voteValue, [paramArgumentValidVote]);
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("commentID", commentID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    if (!(await dbCommentVotable(commentID)))
      throw PERMISSION_ENTITY_DELETED_ERROR("comment", commentID);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    const voteID = `${userID}.${commentID}`;
    try {
      let previousUserVote, voteQuery, totalQuery;
      const previousVoteQuery = await client.query(
        "select vote_positive from comment_votes where vote_id=$1",
        [voteID],
      );
      if (previousVoteQuery.rows.length === 0) {
        previousUserVote = 0;
      } else if (previousVoteQuery.rows[0].vote_positive) {
        previousUserVote = 1;
      } else {
        previousUserVote = -1;
      }
      const voteDifference = voteValue - previousUserVote;
      if (voteValue === 0) {
        voteQuery = await client.query(
          "delete from comment_votes where vote_id = $1",
          [voteID],
        );
      } else if (voteValue === 1) {
        voteQuery = await client.query(
          "insert into comment_votes(vote_id, user_id, comment_id, vote_positive) values($1, $2, $3, TRUE) on conflict (vote_id) do update set vote_positive = TRUE",
          [voteID, userID, commentID],
        );
      } else {
        voteQuery = await client.query(
          "insert into comment_votes(vote_id, user_id, comment_id, vote_positive) values($1, $2, $3, FALSE) on conflict (vote_id) do update set vote_positive = FALSE",
          [voteID, userID, commentID],
        );
      }
      totalQuery = await client.query(
        "update comments set comment_votes = comment_votes + $1 where comment_id = $2 returning comment_votes",
        [voteDifference, commentID],
      );
      return totalQuery.rows[0].comment_votes;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCalculateVotesForPost = async (postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const voteTotalQuery = await client.query(
        `with selected_votes as (select count(*) from post_votes where post_id = $1)
      select
        (select count(*) from selected_votes where vote_positive = TRUE)
        - (select count(*) from selected_votes vote_positive = FALSE)
       as total_votes`,
        [postID],
      );
      return voteTotalQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCalculateVotesForPostsOnInterval = async (beginDate, endDate) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const voteTotalQuery = await client.query(
        `
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
      `,
        [beginDate, endDate],
      );
      return voteTotalQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCalculateVotesForCommentsOnInterval = async (beginDate, endDate) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const voteTotalQuery = await client.query(
        `
      /* Select comments on the given time interval */
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
      `,
        [beginDate, endDate],
      );
      return voteTotalQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
