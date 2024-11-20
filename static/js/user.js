import { getMe, getUser } from "./api.js";
import { getWithSession, postWithSession, putWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $commentWidget, $navBar, $postWidget } from "./shared-components.js";
import {
  children,
  classes,
  make,
  make$Page,
  replaceContent,
  update,
} from "./ui.js";

const $page = make$Page("user");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  userID = location.pathname
    .split("/")
    .filter((path) => path !== "")
    .slice(-1)[0],
  renderUserNotFound = () =>
    replaceContent($page.userInformation, [
      update(make("h1"), { innerText: "This user was not found." }),
    ]);

let userResponse, meInfo;
try {
  [meInfo, userResponse] = await Promise.all([
    getMe(currentSession),
    getUser(currentSession, userID),
  ]);
  userResponse = userResponse.json;
  if (userResponse === undefined) throw "User not found";
} catch (err) {
  renderUserNotFound();
  throw "User not found";
}
const userInformation = userResponse.user,
  userContent = userResponse.content;

const setupSettings = async () => {
  try {
    const userSettings = await getWithSession(currentSession, "/api/settings"),
      postReply = userSettings.json.postReply,
      commentReply = userSettings.json.commentReply;
    $page.userPostReplySetting.checked = postReply;
    $page.userCommentReplySetting.checked = commentReply;
  } catch (err) {
    return classes($page.userSettings, ["hidden"]);
  }
  $page.userNotificationSettingsForm.onsubmit = async (e) => {
    e.preventDefault();
    classes($page.settingsWaiting, [], ["hidden"]);
    const settings = {
      postReply: $page.userPostReplySetting.checked,
      commentReply: $page.userCommentReplySetting.checked,
    };
    try {
      const response = await putWithSession(
        currentSession,
        "/api/settings",
        settings,
      );
      classes($page.settingsWaiting, ["hidden"], []);
      $page.settingsFeedback.innerText = "Successfully updated settings";
      classes($page.settingsFeedback, [], ["hidden"]);
    } catch (err) {
      console.error(err);
      $page.settingsFeedback.innerText = "Failed to update settings";
      classes($page.settingsWaiting, ["hidden"], []);
      classes($page.settingsFeedback, [], ["hidden"]);
    }
    return false;
  };
  classes($page.userSettings, [], ["hidden"]);
};
console.log(meInfo);
if (
  meInfo !== undefined &&
  userInformation.user_username === meInfo.user_username
) {
  classes($page.userYou, [], ["hidden"]);
  setupSettings();
}

console.log(userContent);

update($page.userDisplayName, { innerText: userInformation.user_displayname });
update($page.username, { innerText: userInformation.user_username });

children(
  $page.userContent,
  userContent.map((entity) => {
    const entityType = entity.entity_type;
    let element;
    switch (entityType) {
      case "post":
        element = classes($postWidget(entity), ["user-view-post"]);
        break;
      case "comment":
        element = children(classes(make("div"), ["user-view-comment"]), [
          children(update(make("a"), { href: `/posts/${entity.post_id}` }), [
            update(make("span"), {
              innerText: "comment made on ",
            }),
            update(make("i"), {
              innerText: entity.comment_post_title,
            }),
          ]),
          $commentWidget(
            entity,
            undefined,
            true,
            true,
            undefined,
            entity.post_id,
          ),
        ]);
    }
    console.log(element);
    return element;
  }),
);

console.log(userResponse);
