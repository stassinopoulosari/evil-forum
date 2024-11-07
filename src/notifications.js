#!/usr/bin/env node
import Mailgun from "mailgun.js";
import formData from "form-data";
import { MAILGUN, SECRETS } from "./config.js";
import {
  dbCountQueuedNotifications,
  dbGetNotificationSettings,
  dbUnqueueNotifications,
} from "./db/notifications.js";
import { dbGetUser } from "./db/users.js";

const mailgun = new Mailgun(formData),
  mg = mailgun.client({
    username: "api",
    key: SECRETS.MAILGUN_API_KEY,
  });

export const sendEmailNotifications = async () => {
  let notificationsSent = 0;
  try {
    while ((await dbCountQueuedNotifications()) !== 0) {
      const notificationsToSend = await dbUnqueueNotifications(10);
      for (const notification of notificationsToSend) {
        const notificationSettings = await dbGetNotificationSettings(
            notification.user_id,
          ),
          userInformation = await dbGetUser(
            notification.user_id,
            notification.user_id,
          ),
          userEmail = userInformation.user_email,
          notificationType = notification.notification_type;
        if (
          (notificationType === "post_reply" &&
            !notificationSettings.notification_post_reply) ||
          (notificationType === "comment_reply" &&
            !notificationSettings.notification_comment_reply)
        )
          // Do not send
          continue;
        await mg.messages.create(MAILGUN.DOMAIN, {
          from: MAILGUN.EMAIL,
          to: [userEmail],
          subject: `[Evil Forum] ${notification.notification_information.header}`,
          text: `${notification.notification_information.body}`,
          html: `${notification.notification_information.bodyHTML}`,
        });
        notificationsSent++;
      }
    }
  } catch (err) {
    console.error(err);
    console.log(
      `Successfully sent ${notificationsSent} notification(s) before failure`,
    );
  }
  console.log(`[Notif] ${notificationsSent}`);
};
