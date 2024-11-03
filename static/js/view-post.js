import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postElement } from "./shared-components.js";
import { children, classes, make, make$Page, update } from "./ui.js";

const $page = make$Page("viewPost");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  postID = parseInt(location.pathname.split("/").slice(-1)[0]),
  renderPostNotFound = () =>
    children($page.postSummary, [
      update(make("h1"), { innerText: "This post was not found." }),
    ]);

if (isNaN(postID) || postID < 0) {
  renderPostNotFound();
  throw "Post ID is invalid";
}

try {
  const postInfo = await getWithSession(currentSession, `/api/posts/${postID}`),
    post = postInfo.json.post;
  children($page.postSummary, [
    $postElement(post),
    ...(post.post_text !== null
      ? [update(classes(make("p"), ["content"]), { innerText: post.post_text })]
      : []),
  ]);
} catch (error) {
  renderPostNotFound();
  throw error;
}

const $commentReply = (postID, replyTo, $replyButton) => {
  $replyButton.disabled = true;
  const $replyContainer = classes(make("div"), ["comment-reply"]);
  children($replyContainer, [
    make("textarea"),
    children(classes(make("div"), ["comment-reply-controls"]), [
      update(make("button"), {
        innerText: "cancel",
        onclick: () => {
          $replyButton.disabled = false;
          $replyContainer.remove();
        },
      }),
      update(make("button"), { innerText: "post" }),
    ]),
  ]);
};
