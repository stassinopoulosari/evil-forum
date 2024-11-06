import { getWithSession, makeRequestWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar } from "./shared-components.js";
import { make$Page } from "./ui.js";

const $page = make$Page("user");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  userID = location.pathname
    .split("/")
    .filter((path) => path !== "")
    .slice(-1)[0],
  renderUserNotFound = () =>
    children($page.postSummary, [
      update(make("h1"), { innerText: "This user was not found." }),
    ]);

const userInformation = (
  await getWithSession(currentSession, `/api/users/${userID}`)
).json;
console.log(userInformation);
