import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postWidget } from "./shared-components.js";
import {
  children,
  classes,
  getSynonym,
  make,
  make$Page,
  update,
} from "./ui.js";

const $page = make$Page("homepage");

const currentSession = await getCurrentSession();

const handleMessage = () => {
  const locationURL = new URL(location);
  if (locationURL.searchParams.size === 0) return;
  history.pushState({}, "", ".");
  if (locationURL.searchParams.get("message") === null) return;
  let message, disposition;
  switch (locationURL.searchParams.get("message")) {
    case "loggedIn":
      message = "signed in successfully";
      disposition = "success";
      break;
    case "loginError":
      message = "failed to sign in";
      disposition = "failure";
      break;
    case "loggedOut":
      message = "signed out successfully";
      disposition = "success";
      break;
    case "logoutError":
      message = "failed to sign out";
      disposition = "failure";
      break;
    case "editPostLoggedOut":
      message = "you must be signed in to edit a post";
      disposition = "failure";
      break;
    case "newPostLoggedOut":
      message = "you must be signed in to make a new post";
      disposition = "failure";
      break;
    case "deletedPost":
      message = "deleted post successfully";
      disposition = "success";
      break;
    case "postLockedDeleted":
      message = "cannot edit post: post is locked or deleted";
      disposition = "failure";
      break;
    case "editPostOwnership":
      message = "you cannot edit someone else's post";
      disposition = "failure";
      break;
    case "editLinkPost":
      message = "cannot edit a link post";
      disposition = "failure";
      break;
    case "editPostTwice":
      message = "cannot edit post a second time";
      disposition = "failure";
      break;
    case "failedToEdit":
      message = "unable to edit post";
      disposition = "failure";
      break;
    case "failedToPost":
      message = "failed to make a new post";
      disposition = "failure";
      break;
    default:
      message = `something is ${getSynonym()} here`;
      disposition = "failure";
  }
  update($page.foreheadMessage, { innerText: message });
  // update($page.foreheadMessage, { innerText: subtitle });
  let timeout;
  const dismiss = () => {
    classes($page.forehead, ["forehead-removed"]);
    $page.foreheadDismiss.disabled = true;
    setTimeout(() => $page.forehead.remove(), 1000);
    clearTimeout(timeout);
  };
  update($page.foreheadDismiss, {
    onclick: dismiss,
  });
  timeout = setTimeout(dismiss, 10000);
  classes($page.forehead, [`forehead-${disposition}`], ["hidden"]);
};

const $noPostPlaceholder = children(
  classes(make("div"), ["no-post-placeholder"]),
  [
    update(make("h2"), { innerText: "No posts yet :(" }),
    children(
      update(make("a"), {
        href: currentSession === undefined ? "/auth/google" : "/posts/new",
      }),
      [
        update(make("h3"), {
          innerText:
            currentSession === undefined
              ? "sign in to change that"
              : "make one?",
        }),
      ],
    ),
  ],
);

getWithSession(currentSession, "/api/homepage")
  .then((homepageResponse) => {
    if (!homepageResponse.json)
      throw "Unable to parse JSON from homepage response";
    const homepageJSON = homepageResponse.json;
    console.log(homepageJSON);
    if (homepageJSON.status === true) {
      const posts = homepageJSON.homepage;
      update($page.postsContainer, { innerHTML: "" });
      children(
        $page.postsContainer,
        posts.length > 0
          ? posts.map((post) => $postWidget(post))
          : [$noPostPlaceholder],
      );
    } else {
      throw "Homepage did not load";
    }
  })
  .catch((homepageError) => {
    console.error(homepageError);
    // TODO: Homepage error
  });

$navBar($page.navBar);
handleMessage();
