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

let userResponse;
try {
  userResponse = (await getWithSession(currentSession, `/api/users/${userID}`))
    .json;
} catch (err) {
  $page.userDisplayName.innerText = "User not found.";
  throw "User not found";
}

const userInformation = userResponse.user,
  userContent = userResponse.content;

children(
  $page.userContent,
  userContent.map((content) => {}),
);

console.log(userResponse);
