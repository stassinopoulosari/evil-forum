import express from "express";
import api from "../src/api/api.js";
import * as auth from "../src/auth.js";
import { APPROVED_HOSTNAMES, DOMAIN, PORT, PROTOCOL } from "../src/config.js";
import { dbSession } from "../src/db/db.js";
// Split scheduled jobs to recur dyno
// import { scheduleJobs } from "../recurringFunctions.js";

const staticRoot = "./static";

express()
  // This is needed to parse request bodies
  .use(express.json())
  // Prevent use of raw heroku url, enforce localhost or evil.ari-s.com
  .use((req, res, next) => {
    if (!APPROVED_HOSTNAMES.includes(req.hostname.toLowerCase())) {
      res.status(301);
      return res.redirect(`${PROTOCOL}://${DOMAIN}/`);
    } else {
      next();
    }
  })
  // Use static directory
  .use(express.static(staticRoot))
  // Views for posts and users
  .get("/posts", (req, res) => res.redirect("/"))
  .get("/posts/:id", (req, res) =>
    res.sendFile("views/view-post.html", { root: staticRoot }),
  )
  .get("/posts/:id/edit", (req, res) =>
    res.sendFile("views/edit-post.html", { root: staticRoot }),
  )
  .get("/users", (req, res) => res.redirect("/"))
  .get("/posts", (req, res) => res.redirect("/"))
  .get("/users/:id", (req, res) =>
    res.sendFile("views/user.html", { root: staticRoot }),
  )
  // Prevent direct access to views
  .get(["/views", "/views/*"], (req, res) => res.redirect("/"))
  // Session is for OAuth only
  .use(dbSession)
  .set("trust proxy", 1)
  // Incorporate API and authentication routers
  .use("/api", api)
  .use("/auth", auth.authenticationRouter)
  .use("*", (req, res) => {
    res.status(404);
    return res.sendFile("views/view-404.html", { root: staticRoot });
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  // application specific logging, throwing an error, or other logic here
});

// scheduleJobs();
