import {
  MAX_SESSION_LENGTH,
  SESSION_EXPIRATION_SECONDS,
  SESSION_EXTEND_THRESHOLD,
  SESSION_ID,
} from "../config.js";
import { generateSessionID, hash } from "../sessionID.js";
import {
  client,
  paramArgumentNonNull,
  paramArgumentString,
  validateArgument,
} from "./db.js";
import {
  EXTEND_BEYOND_MAX_LENGTH_ERROR,
  NO_CLIENT_ERROR,
  POSTGRES_ERROR,
  SESSION_UNDEFINED_EXPIRED_ERROR,
} from "./errors.js";

export const dbGetSession = async (sessionID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("sessionID", sessionID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const sessionQuery = await client.query(
        "select * from user_sessions where session_id = $1;",
        [hash(sessionID)],
      );
      if (sessionQuery.rows.length !== 1) return undefined;
      const session = sessionQuery.rows[0];
      if (session.session_expires < new Date()) {
        console.log(
          `Attempt to get session ${sessionID} (userID = ${session.user_id}) failed as session is expired.`,
        );
        dbDeleteSession(sessionID);
        return undefined;
      }
      if (
        session.session_expires.getTime() - new Date().getTime() <
        SESSION_EXTEND_THRESHOLD
      ) {
        const newExtension = new Date(session.session_expires.getTime());
        newExtension.setSeconds(
          newExtension.getSeconds() + SESSION_EXPIRATION_SECONDS,
        );
        try {
          await dbExtendSession(sessionID, session.user_id, newExtension);
          session.session_expires = newExtension;
        } catch {}
      }
      return session;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCreateSession = async (userID, ipAddress, expires) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("ipAddress", ipAddress, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("expires", expires, [paramArgumentNonNull]);
    const sessionID = generateSessionID(
      SESSION_ID.NUM_PER_CATEGORY,
      SESSION_ID.SHUFFLES,
    );
    try {
      await client.query(
        "insert into user_sessions(session_id, user_id, session_expires, session_ip, session_opened) values($1, $2, $3, $4, NOW());",
        [hash(sessionID), userID, expires, ipAddress],
      );
      console.log(`Created session for user ${userID}`);
      return sessionID;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbExtendSession = async (sessionID, userID, expires) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    let currentSessionQuery;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("sessionID", sessionID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("expires", expires, [paramArgumentNonNull]);
    try {
      currentSessionQuery = await client.query(
        "select session_opened, session_expires from user_sessions where session_id = $1 and user_id = $2 limit 1",
        [hash(sessionID), userID],
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
    if (currentSessionQuery.rowCount !== 1) {
      throw SESSION_UNDEFINED_EXPIRED_ERROR(sessionID);
    }
    const session = currentSessionQuery.rows[0];
    if (session.session_expires < new Date()) {
      dbDeleteSession(sessionID);
      throw SESSION_UNDEFINED_EXPIRED_ERROR(sessionID);
    }
    const sessionOpenedDate = new Date();
    sessionOpenedDate.setTime(session.session_opened.getTime());
    const maxSessionExpiry = sessionOpenedDate.setSeconds(
      sessionOpenedDate.getSeconds() + MAX_SESSION_LENGTH,
    );
    if (maxSessionExpiry < expires) {
      throw EXTEND_BEYOND_MAX_LENGTH_ERROR(
        sessionID,
        maxSessionExpiry,
        expires,
      );
    }
    try {
      const extendSessionQuery = await client.query(
        "update user_sessions set session_expires = $1 where session_id = $1 and user_id = $2",
        [expires, hash(sessionID), userID],
      );
      return extendSessionQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCheckSession = async (sessionID, userID, ipAddress) => {
    validateArgument("sessionID", sessionID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("ipAddress", ipAddress, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    const session = await dbGetSession(sessionID);
    if (session === undefined)
      return { passed: false, reason: "session undefined or expired" };
    if (session.session_ip !== ipAddress) {
      dbDeleteSession(sessionID);
      return { passed: false, reason: "IP mismatch. session deleted" };
    }
    if (session.user_id !== userID) {
      return { passed: false, reason: "userID mismatch" };
    }
    return { passed: true, session: session };
  },
  dbDeleteSession = async (sessionID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("sessionID", sessionID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const deletionQuery = await client.query(
        "delete from user_sessions where session_id = $1 returning *;",
        [hash(sessionID)],
      );
      if (deletionQuery.rows.length !== 1) return false;
      return true;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbDeletePastSessions = async () => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const deletionQuery = await client.query(
        "delete from user_sessions where session_expires < now()",
      );
      return deletionQuery;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
