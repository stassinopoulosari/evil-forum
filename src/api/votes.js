import { authenticationFailError } from "../auth.js";
import { dbRegisterCommentVote, dbRegisterPostVote } from "../db/votes.js";

export const routePostPostVote = async (req, res) => {
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "vote");
    }
    const postID = parseInt(req.params.postID);
    if (
      Object.keys(req.body).length === 0 ||
      postID === undefined ||
      typeof postID !== "number" ||
      ![-1, 0, 1].includes(req.body.voteValue)
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.VOTE_POST,
      });
    }
    try {
      const newTotal = await dbRegisterPostVote(
        req.evilUserID,
        postID,
        req.body.voteValue,
      );
      res.json({
        status: true,
        newTotal: newTotal,
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
  routePostCommentVote = async (req, res) => {
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "vote");
    }
    const commentID = parseInt(req.params.commentID);
    if (
      Object.keys(req.body).length === 0 ||
      commentID === undefined ||
      typeof commentID !== "number" ||
      ![-1, 0, 1].includes(req.body.voteValue)
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.VOTE_COMMENT,
      });
    }
    try {
      const newTotal = await dbRegisterCommentVote(
        req.evilUserID,
        commentID,
        req.body.voteValue,
      );
      res.json({
        status: true,
        newTotal: newTotal,
      });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({
        success: false,
        error: err.frontEndMessage ?? err,
      });
    }
  };
