#!/usr/bin/env node

import Mailgun from "mailgun.js";
import formData from "form-data";
import { MAILGUN, SECRETS } from "../config.js";

const mailgun = new Mailgun(formData),
  mg = mailgun.client({
    username: "api",
    key: SECRETS.MAILGUN_API_KEY,
  });

await mg.messages.create(MAILGUN.DOMAIN, {
  from: MAILGUN.EMAIL,
  to: ["apstassinopoulos@willamette.edu"],
  subject: "Clown to Cloud Communication",
  text: "At the email client straight 'jorkin' it'",
  html: "<h1>fuck</h1>",
});

process.exit();
