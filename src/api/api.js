import Router from "express";
import { passSession } from "../auth.js";
import {
  routeDeleteComment,
  routeEditComment,
  routeGetPostComments,
  routePostNewComment,
} from "./comments.js";
import {
  routeDeletePost,
  routeEditPost,
  routeGetPost,
  routePostNewPost,
} from "./posts.js";
import { routeGetHomepage } from "./homepage.js";
import { routePostCommentVote, routePostPostVote } from "./votes.js";
import {
  routeGetUserMe,
  routeGetUser,
  routeGetNotificationSettings,
  routeSetNotificationSettings,
} from "./users.js";
import { rateLimit } from "express-rate-limit";
import { DOCS, rejectWithDocs } from "./apiDocs.js";

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
router
  .post("/posts/new", routePostNewPost)
  .get("/posts/new", rejectWithDocs(DOCS.NEW_POST));

router
  .post("/posts/:postID/vote", routePostPostVote)
  // Show errors for wrong request type
  .get("/posts/:postID/vote", rejectWithDocs(DOCS.VOTE_POST));

router
  .delete("/posts/:postID/delete", routeDeletePost)
  // Show errors for wrong request type
  .post("/posts/:postID/delete", rejectWithDocs(DOCS.DELETE_POST))
  .get("/posts/:postID/delete", rejectWithDocs(DOCS.DELETE_POST));

router
  .put("/posts/:postID/edit", routeEditPost)
  // Show errors for wrong request type
  .post("/posts/:postID/edit", rejectWithDocs(DOCS.EDIT_POST))
  .get("/posts/:postID/edit", rejectWithDocs(DOCS.EDIT_POST));

// Route comment modification functions

router
  .post("/comments/new", routePostNewComment)
  .get("/comments/new", rejectWithDocs(DOCS.NEW_COMMENT));

router
  .post("/comments/:commentID/vote", routePostCommentVote)
  .get("/comments/:commentID/vote", rejectWithDocs(DOCS.VOTE_COMMENT));

router
  .delete("/comments/:commentID/delete", routeDeleteComment)
  // Show errors for wrong request type
  .get("/comments/:commentID/delete", rejectWithDocs(DOCS.DELETE_COMMENT))
  .post("/comments/:commentID/delete", rejectWithDocs(DOCS.DELETE_COMMENT));

router
  .put("/comments/:commentID/edit", routeEditComment)
  // Show errors for wrong request type
  .get("/comments/:commentID/edit", rejectWithDocs(DOCS.EDIT_COMMENT))
  .post("/comments/:commentID/edit", rejectWithDocs(DOCS.EDIT_COMMENT));

// Route homepage and user-facing GETs

router
  .get("/homepage", routeGetHomepage)
  .get("/posts/:postID", routeGetPost)
  .get("/posts/:postID/comments", routeGetPostComments);

// Route user settings

router
  .get("/settings", routeGetNotificationSettings)
  .put("/settings", routeSetNotificationSettings)
  .post("/settings", rejectWithDocs(DOCS.SET_NOTIFICATION_SETTINGS));

router.get("/users/me", routeGetUserMe).get("/users/:username", routeGetUser);

router.use((req, res) => {
  res.status(404);
  res.json({ status: false, error: "Path/request type not found" });
});

export default router;
