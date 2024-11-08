import { editPost, getMe, getPost } from "./api.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postWidget } from "./shared-components.js";
import { make$Page, replaceContent } from "./ui.js";

const $page = make$Page("editPost");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  postID = parseInt(
    location.pathname
      .split("/")
      .filter((path) => path !== "")
      .slice(-2)[0],
  );
if (currentSession === undefined) location.assign("/?message=editLoggedOut");
const [postInformation, userInformation] = await Promise.all([
    getPost(currentSession, postID),
    getMe(currentSession),
  ]),
  post = postInformation.json.post;

console.log(post);

$page.username.innerText = userInformation.user_username;

const updatePreview = () => {
  const title = post.post_title,
    postType = "text";
  replaceContent($page.postSummary, [
    $postWidget(
      {
        post_text: postType === "text" ? "" : undefined,
        post_link: postType === "link" ? postLink : undefined,
        post_title: title,
        user_username: userInformation.user_username,
        user_displayname: userInformation.user_displayname,
        post_id: "new",
        post_mine: true,
        post_timestamp: post.post_timestamp,
        post_edited_at: new Date().toISOString(),
      },
      true,
    ),
  ]);
};

updatePreview();

$page.postTextContent.value = post.post_text;
$page.postTextContent.disabled = false;

if (post.post_locked || post.post_deleted) {
  location.assign("/?message=postLockedDeleted");
  throw "Can't edit post";
}
if (!post.post_mine) {
  location.assign("/?message=editPostOwnership");
  throw "Can't edit post";
}
if (!post.post_text) {
  location.assign("/?message=editLinkPost");
  throw "Can't edit post";
}
if (post.post_edited_at) {
  location.assign("/?message=editPostTwice");
  throw "Can't edit post";
}

$page.editForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await editPost(currentSession, postID, $page.postTextContent.value);
    location.assign(`/posts/${postID}`);
  } catch (err) {
    location.assign("/?message=failedToEdit");
    console.error(err);
  }
  return false;
};
