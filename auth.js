import axios from "axios";
import FormData from "form-data";
import { dbCheckSession, dbCreateSession } from "./db/sessions.js";
import { dbCreateUser, dbGetUserByGoogleID } from "./db/users.js";
import Router from "express";
import {
  DOMAIN,
  PROTOCOL,
  SECRETS,
  SESSION_EXPIRATION_SECONDS,
} from "./config.js";

const getGoogleUserInfo = async (code) => {
  let reqData = new FormData();

  // Send code and necessary secrets to Google to get user information
  reqData.append("code", code);
  reqData.append("client_id", SECRETS.GOOGLE_OAUTH2_CLIENT_ID);
  reqData.append("client_secret", SECRETS.GOOGLE_OAUTH2_CLIENT_SECRET);
  reqData.append("redirect_uri", `${PROTOCOL}://${DOMAIN}/auth/google`);
  reqData.append("grant_type", "authorization_code");

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://oauth2.googleapis.com/token",
    headers: reqData.getHeaders(),
    data: reqData,
  };

  const res = await axios.request(config),
    data = res.data,
    token = data.id_token;
  return JSON.parse(atob(token.split(".")[1]));
};

const createLoginSession = async (userID, ipAddress) => {
  // First, get the user ID
  const expirationSeconds = parseInt(SESSION_EXPIRATION_SECONDS || 10000),
    expirationDate = new Date();

  // Create expiration date
  expirationDate.setSeconds(expirationDate.getSeconds() + expirationSeconds);

  // Create session (this throws on failure)
  const sessionID = await dbCreateSession(userID, ipAddress, expirationDate);
  return {
    sessionID: sessionID,
    expirationDate: expirationDate,
  };
};

export const passSession = async (req, res, next) => {
  // Check for session headers
  if (
    req.get("x-evil-forum-session-id") !== undefined &&
    req.get("x-evil-forum-user-id") !== undefined
  ) {
    // Get user-provided session ID and user ID as well as IP address
    const sessionID = req.get("x-evil-forum-session-id"),
      userID = req.get("x-evil-forum-user-id"),
      ipAddress =
        req.get("x-forwarded-for").split(", ").pop() ||
        req.socket.remoteAddress;
    console.log(ipAddress);
    // Check session against user ID and IP
    const session = await dbCheckSession(sessionID, userID, ipAddress);
    // Fail user out if their session does not exist, is invalid, or is invalidated
    if (session.passed === false) {
      console.warn(session);
      res.status(403);
      return res.json({
        error: session.reason,
        sessionDidNotPass: true,
      });
    }
    // If the session passes, we can trust it and pass it along
    req.evilSession = session.session;
    req.evilUserID = userID;
    next();
  } else {
    // If no session is passed, pass undefined to the next function
    req.evilSession = undefined;
    req.evilUserID = undefined;
    next();
  }
};

// OAuth
export const authenticationRouter = Router();
authenticationRouter
  .get("/google", async (req, res) => {
    if (req.query.code == undefined) {
      const state = crypto.randomUUID(),
        redirectURI = `
    https://accounts.google.com/o/oauth2/v2/auth?
     &scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid
     &access_type=offline
     &include_granted_scopes=true
     &response_type=code
     &state=${state}
     &redirect_uri=${encodeURIComponent(`${PROTOCOL}://${DOMAIN}/auth/google`)}
     &client_id=${SECRETS.GOOGLE_OAUTH2_CLIENT_ID}`.replaceAll(
          /\n|\r| {2,}/g,
          "",
        );
      req.session.state = state;
      res.redirect(redirectURI);
    } else {
      res.sendFile("views/auth-google.html", { root: "." });
    }
  })
  .get("/createSession", async (req, res) => {
    const state = req.session.state,
      query = req.query;
    if (state === undefined || query.state !== state) {
      res.status(401);
      res.json({
        error: "State in session does not match state in OAuth",
      });
      return;
    }
    const code = query.code;
    try {
      const googleUserInfo = await getGoogleUserInfo(code);
      // If user exists, create session
      // Otherwise create user
      const username = googleUserInfo.email,
        displayName = googleUserInfo.name,
        googleID = googleUserInfo.sub;
      let userID = ((await dbGetUserByGoogleID(googleID)) ?? {}).user_id;
      if (userID === undefined) {
        // Create user if none exits
        const newUserID = await dbCreateUser(username, displayName, googleID);
        console.log(newUserID);
        if (newUserID === undefined) {
          res.status(500);
          return res.json({
            error: `Could not create user (${username}, ${displayName}, ${googleID})`,
          });
        }
        userID = newUserID;
      }
      // Get remote IP and create session
      const ipAddress =
        req.get("x-forwarded-for").split(", ").pop() ||
        req.socket.remoteAddress;
      console.log(ipAddress);

      const sessionInformation = await createLoginSession(userID, ipAddress);
      res.json({ session: sessionInformation, userID: userID });
    } catch (err) {
      res.status(500);
      console.error(err);
      return res.json({
        error: "Could not retrieve Google info for user",
      });
    }
  });

// Allow for session refreshes
// This will result in a 403 for an invalid session, 400 for null session, or 200 for valid
authenticationRouter
  .use("/session", passSession)
  .get("/session", (req, res) => {
    if (req.evilSession !== undefined && req.evilUserID !== undefined) {
      res.json({
        sessionExpires: req.evilSession.session_expires,
        userID: req.evilUserID,
      });
    } else {
      res.status(400);
      res.json({
        error: "Session or user ID is undefined",
      });
    }
  });

export const authenticationFailError = (res, action) => {
  res.status(403);
  return res.json({
    success: false,
    error: `User is not authenticated. Could not ${action}.`,
    solution:
      "Ensure you are setting x-evil-forum-user-id and x-evil-forum-session-id headers",
  });
};
