import { authenticationFailError } from "../auth.js";
import {
  dbGetNotificationSettings,
  dbUpdateNotificationSettings,
} from "../db/notifications.js";
import {
  dbGetUser,
  dbGetUserByUsername,
  dbGetUserContent,
} from "../db/users.js";
import { DOCS } from "./apiDocs.js";

export const routeGetUserMe = async (req, res) => {
    if (req.evilSession === undefined || req.evilUserID === undefined) {
      return authenticationFailError(res, "get user information");
    }
    const userID = req.evilUserID;
    return res.json(await dbGetUser(userID, userID));
  },
  routeGetUser = async (req, res) => {
    const username = req.params.username,
      requestorUserID = req.evilUserID,
      passedPage =
        req.query.page === undefined ? undefined : parseInt(req.query.page);
    if (passedPage !== undefined && (isNaN(passedPage) || passedPage < 0)) {
      res.status(400);
      return res.json({
        status: false,
        error: "Page must be a number >= 0",
      });
    }
    try {
      const [userInformation, userContent] = await Promise.all([
        dbGetUserByUsername(username, requestorUserID),
        dbGetUserContent(username, requestorUserID, passedPage),
      ]);
      return res.json({
        status: true,
        user: userInformation,
        content: userContent,
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
  routeGetNotificationSettings = async (req, res) => {
    if (req.evilUserID === undefined || req.evilSession === undefined)
      return authenticationFailError(res, "view notification settings");
    try {
      const settings = await dbGetNotificationSettings(req.evilUserID);
      return res.json({
        postReply: settings.notification_post_reply,
        commentReply: settings.notification_comment_reply,
      });
    } catch (err) {
      res.status(500);
      return res.json({
        success: false,
        error: err.frontEndMessage ?? err,
      });
    }
  },
  routeSetNotificationSettings = async (req, res) => {
    if (req.evilUserID === undefined || req.evilSession === undefined)
      return authenticationFailError(res, "set notification settings");
    if (
      Object.keys(req.body).length === 0 ||
      req.body.postReply === undefined ||
      req.body.commentReply === undefined ||
      typeof req.body.postReply !== "boolean" ||
      typeof req.body.commentReply !== "boolean"
    ) {
      res.status(400);
      return res.json({
        success: false,
        ...DOCS.SET_NOTIFICATION_SETTINGS,
        error: "postReply and commentReply must both be booleans",
      });
    }
    try {
      const settingsObject = {
        notification_post_reply: req.body.postReply,
        notification_comment_reply: req.body.commentReply,
      };
      return res.json({
        success: await dbUpdateNotificationSettings(
          req.evilUserID,
          settingsObject,
        ),
      });
    } catch (err) {
      res.status(500);
      return res.json({
        success: false,
        error: err.frontEndMessage ?? err,
      });
    }
  };
