import { authenticationFailError } from "../auth.js";
import {
  dbCreateComment,
  dbDeleteComment,
  dbEditComment,
  dbGetCommentsForPost,
} from "../db/comments.js";
import { DOCS } from "./apiDocs.js";

export const routeGetPostComments = async (req, res) => {
    const postID = parseInt(req.params.postID),
      passedPage = req.query.page,
      userID = req.evilUserID;
    // Reject invalid page numbers
    if (passedPage !== undefined && (isNaN(passedPage) || passedPage < 0)) {
      res.status(400);
      return res.json({
        status: false,
        error: "Page must be a number >= 0",
      });
    }
    // Get requested comments and send them to the user
    try {
      res.json({
        status: true,
        comments: await dbGetCommentsForPost(postID, passedPage, userID),
      });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({
        success: false,
        error: err.frontEndMessage ?? err,
      });
    }
  },
  routeDeleteComment = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "delete comment");
    }
    const commentID = parseInt(req.params.commentID),
      userID = req.evilUserID;
    if (commentID === undefined || isNaN(commentID)) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.DELETE_COMMENT,
        error: "Comment ID must be defined and a number",
      });
    }
    try {
      await dbDeleteComment(userID, commentID);
      return res.json({ success: true });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  },
  routeEditComment = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "edit comment");
    }
    const commentID = parseInt(req.params.commentID),
      passedContent = req.body.content,
      userID = req.evilUserID;
    if (
      commentID === undefined ||
      isNaN(commentID) ||
      typeof commentID !== "number" ||
      passedContent === undefined ||
      typeof passedContent !== "string" ||
      passedContent.trim().length < 1
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.EDIT_COMMENT,
      });
    }
    try {
      await dbEditComment(userID, commentID, passedContent);
      return res.json({ success: true });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  },
  routePostNewComment = async (req, res) => {
    // Authentication required for this route
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "create comment");
    }
    const passedComment = req.body.comment,
      postID = req.body.postID,
      userID = req.evilUserID;
    if (
      Object.keys(req.body).length === 0 ||
      passedComment === undefined ||
      postID === undefined ||
      typeof passedComment !== "object" ||
      typeof postID !== "number" ||
      typeof passedComment.content !== "string" ||
      (passedComment.replyTo !== undefined &&
        typeof passedComment.replyTo !== "number")
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.NEW_COMMENT,
      });
    }
    const comment = {
      content: passedComment.content,
    };
    if (passedComment.replyTo !== undefined) {
      comment.replyTo = passedComment.replyTo;
    }
    try {
      console.log(
        `Attempting to create comment with userID=${userID}, postID=${postID}, comment=${JSON.stringify(comment)}`,
      );
      const commentResult = await dbCreateComment(userID, postID, comment);
      res.json(commentResult);
    } catch (err) {
      res.status(500);
      console.error(err);
      res.json({ success: false, error: err.frontEndMessage ?? err });
    }
  };
