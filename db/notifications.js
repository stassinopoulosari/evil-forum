import {
  client,
  paramArgumentBoolean,
  paramArgumentNonNull,
  paramArgumentObject,
  paramArgumentStringNotBlank,
  paramArgumentValidNotificationType,
  validateArgument,
} from "./db.js";
import {
  NO_CLIENT_ERROR,
  PERMISSION_USER_BANNED_ERROR,
  POSTGRES_ERROR,
} from "./errors.js";
import { dbUserActive } from "./users.js";

export const dbGetNotificationSettings = async (userID) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    if (!(await dbUserActive(userID))) {
      return {
        notification_post_reply: false,
        notification_comment_reply: false,
      };
    }
    try {
      return (
        (
          await client.query(
            `
            select * from user_notification_settings where user_id = $1 limit 1
            `,
            [userID],
          )
        ).rows[0] ?? {
          notification_post_reply: true,
          notification_comment_reply: true,
        }
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbUpdateNotificationSettings = async (userID, newSettings) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("newSettings", newSettings, [
      paramArgumentNonNull,
      paramArgumentObject,
    ]);
    validateArgument(
      "newSettings.notification_post_reply",
      newSettings.notification_post_reply,
      [paramArgumentNonNull, paramArgumentBoolean],
    );
    validateArgument(
      "newSettings.notification_comment_reply",
      newSettings.notification_comment_reply,
      [paramArgumentNonNull, paramArgumentBoolean],
    );
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    try {
      return (
        (
          await client.query(
            `
            insert
            into
              user_notification_settings(user_id, notification_post_reply, notification_comment_reply)
            values
              ($1, $2, $3)
            on conflict (user_id) do
              update
                set
                notification_post_reply = $2,
                notification_comment_reply = $3`,
            [
              userID,
              newSettings.notification_comment_reply,
              newSettings.notification_post_reply,
            ],
          )
        ).rowCount === 1
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbQueueNotification = async (userID, notificationType, notification) => {
    validateArgument("userID", userID, [
      paramArgumentNonNull,
      paramArgumentStringNotBlank,
    ]);
    validateArgument("notificationType", notificationType, [
      paramArgumentValidNotificationType,
    ]);
    validateArgument("notification", notification, [
      paramArgumentNonNull,
      paramArgumentObject,
    ]);
    if (!(await dbUserActive(userID)))
      throw PERMISSION_USER_BANNED_ERROR(userID);
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      return (
        (
          await client.query(
            `
        insert into queued_notifications(user_id, notification_type, notification_information, notification_queued)
        values ($1, $2, $3, NOW())
      `,
            [userID, notificationType, notification],
          )
        ).rowCount === 1
      );
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbCountQueuedNotifications = async () => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      return (
        await client.query(`
        select count(*) as notification_count from queued_notifications limit 1;
      `)
      ).rows[0].notification_count;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  dbUnqueueNotifications = async (amount) => {
    if (client === undefined) throw NO_CLIENT_ERROR;
    try {
      return (
        await client.query(`
          delete from queued_notifications
          where
            notification_id in (
              select notification_id from queued_notifications
              order by notification_queued
              limit $1
            )
          returning *
        `)
      ).rows;
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  };
