import { authenticationFailError } from "../auth.js";
import { DOCS } from "./apiDocs.js";
import {
  dbCreatePost,
  dbDeletePost,
  dbEditPost,
  dbGetPostWithUserInformation,
} from "../db/posts.js";
import { MAX_POST_LENGTH, MAX_POST_TITLE_LENGTH } from "../config.js";

export const routeGetPost = async (req, res) => {
    const postID = parseInt(req.params.postID);
    const userID = req.evilUserID;
    try {
      res.json({
        status: true,
        post: await dbGetPostWithUserInformation(postID, userID),
      });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({
        status: false,
        error: err.frontEndMessage,
      });
    }
  },
  routeEditPost = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "edit post");
    }
    if (req.body.text === undefined || typeof req.body.text !== "string") {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.EDIT_POST,
      });
    }
    const postID = parseInt(req.params.postID),
      passedText = req.body.text.trim(),
      userID = req.evilUserID;
    if (
      postID === undefined ||
      isNaN(postID) ||
      typeof postID !== "number" ||
      passedText.trim().length < 1 ||
      passedText.trim().length > MAX_POST_LENGTH
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.EDIT_POST,
      });
    }
    try {
      console.log(
        `Attempting to edit post with userID=${userID}, postID=${postID}`,
      );
      await dbEditPost(userID, postID, passedText);
      return res.json({ success: true });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  },
  routeDeletePost = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "delete post");
    }
    const postID = parseInt(req.params.postID),
      userID = req.evilUserID;
    if (postID === undefined || isNaN(postID) || typeof postID !== "number") {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.DELETE_POST,
      });
    }
    try {
      // Good idea to log something like this
      console.log(
        `Attempting to delete post with userID=${userID}, postID=${postID}`,
      );
      await dbDeletePost(userID, postID);
      return res.json({ success: true });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  },
  routePostNewPost = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "create post");
    }
    const passedPost = req.body.post,
      userID = req.evilUserID;
    if (
      // Form content must be passed
      Object.keys(req.body).length === 0 ||
      passedPost === undefined ||
      typeof passedPost !== "object" ||
      typeof passedPost.title !== "string" ||
      // Post must have a non-empty title
      passedPost.title.length < 1 ||
      passedPost.title.length > MAX_POST_TITLE_LENGTH ||
      // Post must have text of proper length
      (passedPost.text !== undefined &&
        passedPost.text.trim().length < 1 &&
        passedPost.text.trim().length > MAX_POST_LENGTH) ||
      // Post cannot be both link and text
      (passedPost.link === undefined && passedPost.text === undefined) ||
      (passedPost.link !== undefined && passedPost.text !== undefined)
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.NEW_POST,
      });
    }
    const post = {
      title: passedPost.title,
    };
    // Validate URI
    if (passedPost.link !== undefined) {
      try {
        const linkURL = new URL(passedPost.link);
        if (!["http:", "https:"].includes(linkURL.protocol)) {
          throw "Unsupported protocol";
        }
        post.link = passedPost.link;
      } catch {
        // This will be triggered if the constructor can't parse the URI
        res.status(400);
        return res.json({
          success: false,
          error: "Only valid HTTP and HTTPS links are supported.",
        });
      }
    } else {
      post.text = passedPost.text.trim();
    }
    try {
      console.log(
        `Attempting to create post with userID=${userID}, post=${JSON.stringify(post)}`,
      );
      const postResult = await dbCreatePost(userID, post);
      res.json(postResult);
    } catch (err) {
      res.status(500);
      console.error(err);
      res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  };
