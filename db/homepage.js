import { HOMEPAGE_ITEMS_PER_PAGE } from "../config.js";
import {
  client,
  paramArgumentNumber,
  paramArgumentString,
  validateArgument,
} from "./db.js";
import { NO_CLIENT_ERROR, POSTGRES_ERROR } from "./errors.js";

export const dbGetHomepage = async (page, userID) => {
  if (client === undefined) throw NO_CLIENT_ERROR;
  let offset;
  if (page === undefined) offset = 0;
  validateArgument("userID", userID, [paramArgumentString]);
  validateArgument("page", page, [paramArgumentNumber]);
  offset = HOMEPAGE_ITEMS_PER_PAGE * Math.floor(page ?? 0);
  const userIDParam = userID === undefined ? [] : [userID];
  try {
    const homepageQuery = await client.query(
      `
        ${
          userID !== undefined
            ? `
        with my_posts as (select post_id, TRUE as post_mine from posts where post_score != 0 and user_id = $3)
        `
            : ""
        }
        select
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
          user_username${userID !== undefined ? ",vote_positive, coalesce(my_posts.post_mine, FALSE) as post_mine" : ""}
        from
          posts
          join users on posts.user_id = users.user_id
          ${
            userID !== undefined
              ? `
          left join post_votes on posts.post_id = post_votes.post_id and post_votes.user_id = $3
          left join my_posts on posts.post_id = my_posts.post_id
          `
              : ""
          }
        where post_score != 0 order by post_score desc, post_timestamp, post_id desc limit $1 offset $2`,
      [HOMEPAGE_ITEMS_PER_PAGE, offset, ...userIDParam],
    );
    return homepageQuery.rows;
  } catch (err) {
    throw POSTGRES_ERROR(err);
  }
};
