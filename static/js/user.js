import { getUser } from "./api.js";
import { getCurrentSession } from "./session.js";
import { $commentWidget, $navBar, $postWidget } from "./shared-components.js";
import { children, classes, make, make$Page, update } from "./ui.js";

const $page = make$Page("user");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  userID = location.pathname
    .split("/")
    .filter((path) => path !== "")
    .slice(-1)[0],
  renderUserNotFound = () =>
    children($page.userInformation, [
      update(make("h1"), { innerText: "This user was not found." }),
    ]);

let userResponse;
try {
  userResponse = (await getUser(currentSession, userID)).json;
} catch (err) {
  renderUserNotFound;
  throw "User not found";
}

const userInformation = userResponse.user,
  userContent = userResponse.content;

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
