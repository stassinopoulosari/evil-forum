import { createPost, getMe } from "./api.js";
import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postWidget } from "./shared-components.js";
import { make$Page, replaceContent, style, update } from "./ui.js";

const $page = make$Page("newPost");

const currentSession = await getCurrentSession();

if (currentSession === undefined) {
  // TODO - Not signed in error
  location.assign("/?message=newPostError&reason=notSignedIn");
}

const userInformation = await getMe(currentSession);
update($page.username, { innerText: userInformation.user_displayname });

const $radioButtons = [$page.postTypeText, $page.postTypeLink];

const getSelectedPostType = () => {
  return $radioButtons.filter(($radio) => $radio.checked)[0].value;
};

const $dummyPost = $page.dummyPost;

const updatePreview = () => {
  const title =
      $page.postTitle.value.trim().length > 1
        ? $page.postTitle.value
        : "my evil plan",
    postType = getSelectedPostType(),
    postLink = $page.postLinkContent.value;
  replaceContent($dummyPost, [
    $postWidget(
      {
        post_text: postType === "text" ? "" : undefined,
        post_link: postType === "link" ? postLink : undefined,
        post_title: title,
        user_username: userInformation.user_username,
        user_displayname: userInformation.user_displayname,
        post_id: "new",
        post_mine: true,
        post_timestamp: new Date(Date.now() + 10000).toISOString(),
      },
      true,
    ),
  ]);
};

updatePreview();

$page.postLinkContent.onkeyup =
  $page.postTextContent.onkeyup =
  $page.postTitle.onkeyup =
    updatePreview;
$radioButtons.forEach(($button) => ($button.onselect = updatePreview));

$radioButtons.map(($radioButton) => {
  $radioButton.onchange = () => {
    let $thisContainer = $page.postTextContentContainer,
      $otherContainer = $page.postLinkContentContainer;
    update($page.postTextContent, { required: true });
    update($page.postLinkContent, { required: false });

    if (getSelectedPostType() === "link") {
      $thisContainer = $page.postLinkContentContainer;
      $otherContainer = $page.postTextContentContainer;
      update($page.postTextContent, { required: false });
      update($page.postLinkContent, { required: true });
    }
    // clearContent();
    style($thisContainer, { display: "block" });
    style($otherContainer, { display: "none" });
  };
});

$page.form.onsubmit = async (e) => {
  e.preventDefault();
  // TODO disable elements while posting
  const postType = getSelectedPostType(),
    postTitle = $page.postTitle.value;
  const post = {
    title: postTitle,
  };
  if (postType === "link") {
    post.link = $page.postLinkContent.value;
  } else {
    post.text = $page.postTextContent.value;
  }
  const session = await getCurrentSession(),
    response = await createPost(session, post),
    postID = response.post_id;
  location.assign(`/posts/${postID}`);
  // TODO redirect to post on success
  // TODO post error
  return false;
};

$navBar($page.navBar);
