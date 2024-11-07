import Pool from "pg";
import { PROTOCOL, SECRETS } from "../config.js";
import { MALFORMED_PARAMETER_ERROR } from "./errors.js";
import session from "express-session";
import store from "connect-pg-simple";
import sanitizeHtml from "sanitize-html";
const pool = new Pool.Pool({
  connectionString: SECRETS.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export let client = undefined;

const PGSession = store(session);

const sessionStore = new PGSession({
  pool: pool,
  tableName: "express_sessions",
});

export const dbSession = session({
    store: sessionStore,
    secret: SECRETS.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  }),
  setupDB = async () => {
    if (client === undefined) {
      throw NO_CLIENT_ERROR;
    }
    try {
      return await client.query(`
    create extension pgcrypto;
    create table "users"(
      user_id uuid primary key,
      user_email text,
      user_google_id text not null,
      user_username text unique not null,
      user_displayname text not null,
      user_banned boolean
    );
    create table "posts"(
      post_id serial primary key,
      user_id uuid references users(user_id),
      post_title text not null,
      post_timestamp timestamptz not null,
      post_text text,
      post_link text,
      post_votes integer,
      post_score numeric(10,6),
      post_locked boolean,
      post_deleted boolean,
      post_deletion_reason text,
      post_edited_at timestamptz
    );
    create table "comments"(
      comment_id serial primary key,
      post_id integer references posts(post_id) not null,
      user_id uuid references users(user_id),
      comment_replyto integer references comments(comment_id),
      comment_root integer references comments(comment_id),
      comment_votes integer,
      comment_chain_depth integer,
      comment_content text not null,
      comment_timestamp timestamptz not null,
      comment_locked boolean,
      comment_deleted boolean,
      comment_deletion_reason text,
      comment_edited_at timestamptz
    );
    create table "comment_votes"(
      vote_id text primary key,
      comment_id integer references comments(comment_id) not null,
      user_id uuid references users(user_id) not null,
      vote_positive boolean not null
    );
    create table "post_votes"(
      vote_id text primary key,
      post_id integer references posts(post_id) not null,
      user_id uuid references users(user_id) not null,
      vote_positive boolean not null
    );
    create table "user_sessions"(
      session_id uuid primary key,
      user_id uuid references users(user_id) not null,
      session_expires timestamptz not null,
      session_opened timestamptz not null,
      session_ip text not null
    );
    create table "queued_notifications"(
      notification_id serial primary key,
      user_id uuid references users(user_id) not null,
      notification_type text not null,
      notification_information json not null,
      notification_queued timestamptz not null
    );
    create table "user_notification_settings"(
      user_id uuid references users(user_id) unique not null,
      notification_post_reply boolean,
      notification_comment_reply boolean
    );
    -- From connect-pg-simple middleware
    create table "express_sessions" (
      "sid" varchar not null collate "default",
      "sess" json not null,
      "expire" timestamp(6) not null
    )
    with (oids = FALSE);
    alter table "express_sessions" add constraint "express_sessions_pkey" primary key ("sid") not deferrable initially immediate;
    create index "IDX_express_sessions_expire" on "express_sessions" ("expire");
    `);
    } catch (err) {
      throw POSTGRES_ERROR(err);
    }
  },
  validateArgument = (argumentName, argument, parameters) => {
    parameters.map((parameter) => parameter(argumentName, argument));
  },
  paramArgumentNonNull = (argumentName, argument) => {
    if (argument === null || argument === undefined)
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentNumber = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      (typeof argument !== "number" || isNaN(argument))
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentObject = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      typeof argument !== "object"
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentString = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      typeof argument !== "string"
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentStringNotBlank = (argumentName, argument) => {
    if (
      argument !== null &&
      argument !== undefined &&
      (typeof argument !== "string" || argument.trim().length <= 0)
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentBoolean = (argumentName, argument) => {
    if (argument !== undefined && ![true, false].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentValidVote = (argumentName, argument) => {
    if (![-1, 0, 1].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentValidNotificationType = (argumentName, argument) => {
    if (!["post_reply", "comment_reply"].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  san = (text) =>
    sanitizeHtml(text, { allowedTags: [], allowedAttributes: [] });

try {
  client = await pool.connect();
  try {
    console.log("Attempting DB setup");
    await setupDB();
    console.log("DB setup complete.");
  } catch (err) {
    console.log("DB already set up");
  }
} catch (err) {
  console.error(err);
}
