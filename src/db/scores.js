import { SCORE } from "../config.js";
import {
  client,
  paramArgumentNonNull,
  paramArgumentNumber,
  validateArgument,
} from "./db.js";
import { NO_CLIENT_ERROR, POSTGRES_ERROR } from "./errors.js";

export const dbCalculateScoreForPost = async (postID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("postID", postID, [
      paramArgumentNonNull,
      paramArgumentNumber,
    ]);
    try {
      const postScoresQuery = await client.query({
        name: "calculate_post_score_query",
        text: `
      with zero_score_post as (
        select
          post_id
        from
          posts
        where
          post_id = $1
          and (
            (post_timestamp <= now() - interval '${SCORE.MAX_HOURS_ON_HOMEPAGE} hours')
            or post_deleted = TRUE
          )
        limit 1
      ),
      score_post as (
        select
          post_id,
          post_votes,
          extract(epoch from (now() - post_timestamp))::float as post_seconds_ago
        from posts
        where post_id = $1 and post_timestamp > now() - interval '${SCORE.MAX_HOURS_ON_HOMEPAGE} hours'
        limit 1
      ),
      post_score as (
        select
          post_id,
          ((
            ${SCORE.NUMERATOR} / ((post_seconds_ago) / (60 * 60) + ${SCORE.INTERCEPT})
          )::numeric(10,6) + post_votes) as new_post_score
        from score_post
      ),
      update_zero_scores as (
        update posts set post_score = 0 from zero_score_post where posts.post_id = zero_score_post.post_id
      )
      update posts set post_score = post_score.new_post_score from post_score where posts.post_id = post_score.post_id;
      `,
        values: [postID],
      });
      return postScoresQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCalculatePostScores = async () => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const postScoresQuery = await client.query({
        name: "calculate_post_scores_query",
        text: `
      with zero_score_posts as (
        select post_id from posts where
        (post_timestamp <= now() - interval '${SCORE.MAX_HOURS_ON_HOMEPAGE} hours')
        or post_deleted = TRUE
      ),
      score_posts as (
        select
          post_id,
          post_votes,
          extract(epoch from (now() - post_timestamp))::float as post_seconds_ago
        from posts
        where (post_deleted is null or post_deleted = FALSE) and post_timestamp > now() - interval '${SCORE.MAX_HOURS_ON_HOMEPAGE} hours'
      ),
      post_scores as (
        select
          post_id,
          ((
            ${SCORE.NUMERATOR} / ((post_seconds_ago) / (60 * 60) + ${SCORE.INTERCEPT})
          )::numeric(10,6) + post_votes) as new_post_score
        from score_posts
      ),
      update_post_scores as (
        update posts set post_score = post_scores.new_post_score from post_scores where posts.post_id = post_scores.post_id
      )
      update posts set post_score = 0 from zero_score_posts where posts.post_id = zero_score_posts.post_id
      `,
      });
      return postScoresQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
