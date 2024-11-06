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
    const userID = req.evilUserID ?? undefined;
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
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "edit post");
    }
    const postID = parseInt(req.params.postID),
      passedText = req.body.text.trim(),
      userID = req.evilUserID;
    if (
      postID === undefined ||
      isNaN(postID) ||
      typeof postID !== "number" ||
      passedText === undefined ||
      typeof passedText !== "string" ||
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
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "create post");
    }
    const passedPost = req.body.post.trim(),
      userID = req.evilUserID;
    if (
      Object.keys(req.body).length === 0 ||
      passedPost === undefined ||
      typeof passedPost !== "object" ||
      typeof passedPost.title !== "string" ||
      passedPost.title.length < 1 ||
      passedPost.title.length > MAX_POST_TITLE_LENGTH ||
      (passedPost.text !== undefined &&
        passedPost.text.trim().length < 1 &&
        passedPost.text.trim().length > MAX_POST_LENGTH) ||
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
    if (passedPost.link !== undefined) {
      try {
        const linkURL = new URL(passedPost.link);
        if (!["http:", "https:"].includes(linkURL.protocol)) {
          throw "Unsupported protocol";
        }
        post.link = passedPost.link;
      } catch {
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
  },
  routeGetEditPost = (req, res) => {
    res.status(400);
    return res.json({
      success: false,
      ...DOCS.EDIT_POST,
    });
  },
  routeGetDeletePost = (req, res) => {
    res.status(400);
    return res.json({
      success: false,
      ...DOCS.DELETE_POST,
    });
  },
  routeGetNewPost = (req, res) => {
    res.status(400);
    return res.json({
      success: false,
      ...DOCS.NEW_POST,
    });
  };
