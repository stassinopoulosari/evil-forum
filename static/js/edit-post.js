import { editPost, getMe } from "./api.js";
import { getWithSession } from "./network.js";
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
if (currentSession === undefined)
  location.assign("/?message=editPostError&reason=not-logged-in");
const [postInformation, userInformation] = await Promise.all([
    getWithSession(currentSession, `/api/posts/${postID}`),
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

if (
  post.post_text === null ||
  post.post_edited_at !== null ||
  !post.post_mine ||
  post.post_locked ||
  post.post_deleted
) {
  // TODO error message
  throw "Can't edit post";
}

$page.editForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    await editPost(currentSession, postID, $page.postTextContent.value);
    location.assign(`/posts/${postID}`);
  } catch (err) {
    console.error(err);
    //TODO Handle error
  }
  return false;
};
