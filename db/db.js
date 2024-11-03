import Pool from "pg";
import { SECRETS } from "../config.js";
import { MALFORMED_PARAMETER_ERROR } from "./errors.js";
const pool = new Pool.Pool({
  connectionString: SECRETS.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export let client = undefined;

export const setupDB = async () => {
    if (client === undefined) {
      throw NO_CLIENT_ERROR;
    }
    try {
      return await client.query(`
    create extension pgcrypto;
    create table "users"(
      user_id uuid primary key,
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
      session_user_id uuid references users(user_id) not null,
      session_expires timestamptz not null,
      session_opened timestamptz not null,
      session_ip text not null
    );`);
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
      (typeof argument !== "string" || argument.trim().length <= 2)
    )
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  },
  paramArgumentValidVote = (argumentName, argument) => {
    if (![-1, 0, 1].includes(argument))
      throw MALFORMED_PARAMETER_ERROR(argumentName, argument);
  };

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
