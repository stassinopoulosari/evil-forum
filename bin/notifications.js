#!/usr/bin/env node
import Mailgun from "mailgun.js";
import formData from "form-data";
import { MAILGUN, SECRETS } from "../config.js";
import {
  dbCountQueuedNotifications,
  dbGetNotificationSettings,
  dbUnqueueNotifications,
} from "../db/notifications.js";
import { dbGetUser } from "../db/users.js";

const mailgun = new Mailgun(formData),
  mg = mailgun.client({
    username: "api",
    key: SECRETS.MAILGUN_API_KEY,
  });

while ((await dbCountQueuedNotifications()) !== 0) {
  const notificationsToSend = await dbUnqueueNotifications(10);
  notificationsToSend.forEach(async (notification) => {
    const notificationSettings = await dbGetNotificationSettings(
        notification.user_id,
      ),
      userEmail = (await dbGetUser(notification.user_id)).user_email,
      notificationType = notification.notification_type;
    if (
      (notificationType === "post_reply" &&
        !notificationSettings.notification_post_reply) ||
      (notificationType === "comment_reply" &&
        !notificationSettings.notification_comment_reply)
    )
      // Do not send
      return;
    await mg.messages.create(MAILGUN.DOMAIN, {
      from: MAILGUN.EMAIL,
      to: [userEmail],
      subject: `[Evil Forum] ${notification.notification_information.header}`,
      text: `${notification.notification_information.body}`,
      // html: `${notification.notification_information.body.split(/\n/g).join("<br>")}`,
    });
  });
}
await mg.messages.create(MAILGUN.DOMAIN, {
  from: MAILGUN.EMAIL,
  to: ["apstassinopoulos@willamette.edu"],
  subject: "Clown to Cloud Communication",
  text: "At the email client straight 'jorkin' it'",
  html: "<h1>fuck</h1>",
});

process.exit();
