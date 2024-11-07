import { ToadScheduler, SimpleIntervalJob, Task } from "toad-scheduler";
import { dbDeletePastSessions } from "./db/sessions.js";
import {
  dbCalculateVotesForPostsOnInterval,
  dbCalculateVotesForCommentsOnInterval,
} from "./db/votes.js";
import { dbCalculatePostScores } from "./db/scores.js";
import { sendEmailNotifications } from "./notifications.js";

const scheduler = new ToadScheduler();
const everyThirtySeconds = new Task("everyMinute", async () => {
    try {
      console.log(
        "MARK - 30 seconds. Deleting past sessions and sending e-mail.",
      );
      // Delete old sessions
      console.log("[sessions]", (await dbDeletePastSessions()).rowCount);
      // Send e-mail
      console.log("[mail]", await sendEmailNotifications());
    } catch (err) {
      console.error(err);
    }
  }),
  everyThirtySecondsJob = new SimpleIntervalJob(
    { seconds: 30 },
    everyThirtySeconds,
  );

const everyTenMinutes = new Task("everyTenMinutes", async () => {
    try {
      console.log("MARK - 10 minutes. Recalculating homepage.");
      // Delete old sessions
      console.log("[homepage]", (await dbCalculatePostScores()).rowCount);
    } catch (err) {
      console.error(err);
    }
  }),
  everyTenMinutesJob = new SimpleIntervalJob({ minutes: 10 }, everyTenMinutes);

const everyHour = new Task("everyHour", async () => {
    try {
      console.log("MARK - 1 hour. Recalculating past day votes.");
      const oneDayInSeconds = 24 * 60 * 60,
        date = new Date();
      date.setSeconds(date.getSeconds() - oneDayInSeconds);
      console.log(
        "[post votes (today)]",
        (await dbCalculateVotesForPostsOnInterval(date, new Date())).rowCount,
      );
    } catch (err) {
      console.error(err);
    }
  }),
  everyHourJob = new SimpleIntervalJob({ hours: 1 }, everyHour);

const everyDay = new Task("everyDay", async () => {
    // Recalculate votes for all posts and comments
    console.log("MARK - 1 day. Recalculating all post votes.");
    const beginningOfTime = new Date();
    beginningOfTime.setTime(0);
    console.log(
      "[post votes (all time)]"(
        await dbCalculateVotesForPostsOnInterval(beginningOfTime, new Date()),
      ).rowCount,
    );
    console.log(
      "[comment votes(all time)]"(
        await dbCalculateVotesForCommentsOnInterval(
          beginningOfTime,
          new Date(),
        ),
      ).rowCount,
    );
  }),
  everyDayJob = new SimpleIntervalJob({ days: 1 }, everyDay);

export const scheduleJobs = () => {
  console.log("Scheduling jobs");
  [
    everyThirtySecondsJob,
    everyTenMinutesJob,
    everyHourJob,
    everyDayJob,
  ].forEach((job) => scheduler.addSimpleIntervalJob(job));
};
