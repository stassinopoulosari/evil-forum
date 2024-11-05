import Router from "express";
import { passSession } from "../auth.js";
import {
  routeDeleteComment,
  routeEditComment,
  routeGetDeleteComment,
  routeGetEditComment,
  routeGetNewComment,
  routeGetPostComments,
  routePostNewComment,
} from "./comments.js";
import {
  routeDeletePost,
  routeEditPost,
  routeGetDeletePost,
  routeGetEditPost,
  routeGetNewPost,
  routeGetPost,
  routePostNewPost,
} from "./posts.js";
import { routeGetHomepage } from "./homepage.js";
import {
  routeGetCommentVote,
  routeGetPostVote,
  routePostCommentVote,
  routePostPostVote,
} from "./votes.js";
import { routeGetUserMe, routeGetUser } from "./users.js";
import { rateLimit } from "express-rate-limit";

const router = Router();

// API root
router.get("/", (req, res) =>
  res.json({
    name: "Evil Forum API v1",
  }),
);

router.use(passSession).use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-7",
  }),
);

// Route post modification functions
router.post("/posts/new", routePostNewPost).get("/posts/new", routeGetNewPost);

router
  .post("/posts/:postID/vote", routePostPostVote)
  .get("/posts/:postID/vote", routeGetPostVote);

// TODO delete post
router
  .delete("/posts/:postID/delete", routeDeletePost)
  // Show errors for wrong request type
  .post("/posts/:postID/delete", routeGetDeletePost)
  .get("/posts/:postID/delete", routeGetDeletePost);

// TODO edit post
router
  .put("/posts/:postID/edit", routeEditPost)
  // Show errors for wrong request type
  .post("/posts/:postID/edit", routeGetEditPost)
  .get("/posts/:postID/edit", routeGetEditPost);

// Route comment modification functions

router
  .post("/comments/new", routePostNewComment)
  .get("/comments/new", routeGetNewComment);

router
  .post("/comments/:commentID/vote", routePostCommentVote)
  .get("/comments/:commentID/vote", routeGetCommentVote);

router
  .delete("/comments/:commentID/delete", routeDeleteComment)
  // Show errors for wrong request type
  .get("/comments/:commentID/delete", routeGetDeleteComment)
  .post("/comments/:commentID/delete", routeGetDeleteComment);

router
  .put("/comments/:commentID/edit", routeEditComment)
  // Show errors for wrong request type
  .get("/comments/:commentID/edit", routeGetEditComment)
  .post("/comments/:commentID/edit", routeGetEditComment);

// Route homepage and user-facing GETs

router
  .get("/homepage", routeGetHomepage)
  .get("/posts/:postID", routeGetPost)
  .get("/posts/:postID/comments", routeGetPostComments);

router.get("/user/me", routeGetUserMe).get("/users/:username", routeGetUser);

export default router;
