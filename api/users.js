import { authenticationFailError } from "../auth.js";
import { dbGetUser } from "../db/users.js";

export const routeGetUserMe = async (req, res) => {
  if (req.evilSession === undefined || req.evilUserID === undefined) {
    return authenticationFailError(res, "get user information");
  }
  const userID = req.evilUserID;
  return res.json(await dbGetUser(userID, userID));
};
