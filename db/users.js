import {
  client,
  paramArgumentNonNull,
  paramArgumentString,
  validateArgument,
} from "./db.js";
import {
  NO_CLIENT_ERROR,
  PERMISSION_ENTITY_DELETED_ERROR,
  POSTGRES_ERROR,
} from "./errors.js";

export const dbUserActive = async (userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const userQuery = await client.query(
        "select user_id from users where user_id = $1 and (user_banned = FALSE or user_banned is NULL)",
        [userID],
      );
      if (userQuery.rows.length === 1) return true;
      return false;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCreateUser = async (username, displayName, googleID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("displayName", displayName, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    validateArgument("googleID", googleID, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const duplicateUsernameRows = await client.query(
        "select * from users where user_username = $1 or user_google_id = $2",
        [username, googleID],
      );
      if (duplicateUsernameRows.rows.length !== 0) {
        throw "User already exists";
      }
      const newUser = await client.query(
        "insert into users (user_id, user_username, user_displayname, user_google_id) values(gen_random_uuid(), $1, $2, $3) returning *;",
        [username, displayName, googleID],
      );
      return newUser.rows[0].user_id;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUser = async (userID, requestorUserID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      let fields = ["user_username", "user_displayname"];
      if (userID === requestorUserID) {
        fields.push("user_banned");
      }
      return (
        await client.query(
          `
        select ${fields.join(", ")}
        from users
        where user_id = $1 limit 1
        `,
          [userID],
        )
      ).rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUserByUsername = async (username, requestorUserID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("username", username, [
      paramArgumentNonNull,
      paramArgumentString,
    ]);
    try {
      const userIDQuery = await client.query(
        "select user_id from users where user_username = $1 limit 1",
      );
      if (userIDQuery.rows.length === 0)
        throw PERMISSION_ENTITY_DELETED_ERROR("user", username);
      return await dbGetUser(userIDQuery.rows[0].user_id, requestorUserID);
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbGetUserByGoogleID = async (googleID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      const userQuery = await client.query(
        "select * from users where user_google_id = $1",
        [googleID],
      );
      if (userQuery.rows.length !== 1) {
        return undefined;
      }
      return userQuery.rows[0];
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
