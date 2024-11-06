import { authenticationFailError } from "../auth.js";
import { dbGetUser, dbGetUserContent } from "../db/users.js";

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
      return res.json({
        status: true,
        content: await dbGetUserContent(username, requestorUserID, passedPage),
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
