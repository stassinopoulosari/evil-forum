import { MAX_COMMENT_DEPTH } from "../config.js";

export const NO_CLIENT_ERROR = {
    frontEndMessage: "Database Error: No client",
    debugMessage: "client === undefined returns true. unable to spawn query.",
  },
  MALFORMED_PARAMETER_ERROR = (parameter, value) => ({
    frontEndMessage: "Database Error: Malformed parameter",
    debugMessage: `undefined or malformed parameter ${parameter} = "${value}"`,
  }),
  POSTGRES_ERROR = (err) => ({
    frontEndMessage: "Database Error: Query Failed",
    debugMessage: `postgres error ${err}`,
  }),
  USER_ID_MISMATCH_ERROR = (userID) => ({
    frontEndMessage: `You may not edit or delete another user's content`,
    debugMessage: `attempt by ${userID} to edit or delete another user's content`,
  }),
  PERMISSION_USER_BANNED_ERROR = (userID) => ({
    frontEndMessage: "Permission Error: User is banned.",
    debugMessage: `user_banned is true for user ${userID}`,
  }),
  PERMISSION_ENTITY_LOCKED_ERROR = (entityType, entityID) => ({
    frontEndMessage: `Cannot interact with ${entityType}, as it has been locked, deleted, or does not exist.`,
    debugMessage: `attempt to interact with entity ${entityType}[${entityID}], which has been locked or deleted`,
  }),
  PERMISSION_ENTITY_DELETED_ERROR = (entityType, entityID) => ({
    frontEndMessage: `Cannot interact with ${entityType}, as it has been deleted or does not exist.`,
    debugMessage: `attempt to interact with entity ${entityType}[${entityID}], which has been deleted or does not exist`,
  }),
  MAX_COMMENT_DEPTH_ERROR = {
    frontEndMessage: `Cannot post a comment over the maximum depth of ${MAX_COMMENT_DEPTH}`,
    debugMessage: `attempted to post a comment over maximum comment depth`,
  },
  SESSION_UNDEFINED_EXPIRED_ERROR = (sessionID) => ({
    frontEndMessage: `This session is undefined or expired, please reauthenticate`,
    debugMessage: `attempted to verify, access, or extend undefined session "${sessionID}"`,
  }),
  LINK_POST_EDIT_ERROR = {
    frontEndMessage: `Only text posts may be edited`,
    debugMessage: `attempt to edit a link post`,
  },
  MULTIPLE_EDIT_ERROR = {
    frontEndMessage: `Content may only be edited once`,
    debugMessage: `attempt to edit a comment or post a second time`,
  },
  EXTEND_BEYOND_MAX_LENGTH_ERROR = (sessionID, maxExpiry, attemptedExpiry) => ({
    frontEndMessage: "Count not extend session beyond maximum length",
    debugMessage: `attempted to extend session ${sessionID} to ${attemptedExpiry} > maxExpiry ${maxExpiry}`,
  });
