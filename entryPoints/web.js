import express from "express";
import session from "express-session";
import api from "../api/api.js";
import * as auth from "../auth.js";
import { PORT, SECRETS } from "../config.js";
import { dbSession } from "../db/db.js";
// Split scheduled jobs to recur dyno
// import { scheduleJobs } from "../recurringFunctions.js";

express()
  // This is needed to parse request bodies
  .use(express.json())
  // Use static directory
  .use(express.static("./static"))
  // Views for posts and users
  .get("/posts", (req, res) => res.redirect("/"))
  .get("/posts/:id", (req, res) =>
    res.sendFile("views/view-post.html", { root: "." }),
  )
  .get("/posts/:id/edit", (req, res) =>
    res.sendFile("views/edit-post.html", { root: "." }),
  )
  .get("/users", (req, res) => res.redirect("/"))
  .get("/users/:id", (req, res) =>
    res.sendFile("views/user.html", { root: "." }),
  )
  // Session is for OAuth only
  .use(dbSession)
  // Incorporate API and authentication routers
  .use("/api", api)
  .use("/auth", auth.authenticationRouter)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  // application specific logging, throwing an error, or other logic here
});

// scheduleJobs();
