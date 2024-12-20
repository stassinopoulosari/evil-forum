import { createPost, getMe } from "./api.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postWidget } from "./shared-components.js";
import { make$Page, replaceContent, style, update } from "./ui.js";

const $page = make$Page("newPost");

const currentSession = await getCurrentSession();

if (currentSession === undefined) {
  location.assign("/?message=newPostLoggedOut");
  throw "Not signed in";
}

const userInformation = await getMe(currentSession);
update($page.username, { innerText: userInformation.user_displayname });

const $radioButtons = [$page.postTypeText, $page.postTypeLink];

const getSelectedPostType = () => {
  return $radioButtons.filter(($radio) => $radio.checked)[0].value;
};

const $dummyPost = $page.dummyPost;

const isValidURL = (url) => {
  try {
    if (!["http:", "https:"].includes(new URL(url.toLowerCase()).protocol))
      throw "";
    return true;
  } catch {
    return false;
  }
};

const updatePreview = () => {
    if ($page.postTitle.value.trim().length < 1) {
      $page.submitButton.disabled = true;
      $page.submitLabel.innerText = "Your title must not be blank";
    } else if (
      getSelectedPostType() === "text" &&
      $page.postTextContent.value.trim().length < 2
    ) {
      $page.submitButton.disabled = true;
      $page.submitLabel.innerText = "Your post text must not be blank";
    } else if (
      getSelectedPostType() === "link" &&
      ($page.postLinkContent.value.trim().length < 2 ||
        !isValidURL($page.postLinkContent.value))
    ) {
      $page.submitButton.disabled = true;
      $page.submitLabel.innerText =
        "Your post link must not be blank and must have an http or https protocol";
    } else {
      $page.submitButton.disabled = false;
      $page.submitLabel.innerText = "";
    }
    const title =
        $page.postTitle.value.trim().length >= 1
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
  },
  $formElements = [
    $page.postTitle,
    $page.postLinkContent,
    $page.postTextContent,
    ...$radioButtons,
    $page.submitButton,
  ],
  disableForm = () => {
    [].forEach.call($formElements, ($element) => {
      $element.disabled = true;
    });
  },
  enableForm = () => {
    [].forEach.call($formElements, ($element) => {
      $element.disabled = false;
    });
  };

updatePreview();

$page.postLinkContent.onkeyup =
  $page.postTextContent.onkeyup =
  $page.postTitle.onkeyup =
    updatePreview;
$radioButtons.forEach(
  ($button) => ($button.onclick = $button.onchange = updatePreview),
);

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
  disableForm();
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
  try {
    const session = await getCurrentSession(),
      response = await createPost(session, post),
      postID = response.post_id;
    location.assign(`/posts/${postID}`);
  } catch (err) {
    enableForm();
    $page.submitLabel.innerText = `Failed to make post. Please try again later (and see the console for a more specific error message)`;
    // location.assign("/?message=failedToPost");
  }
  return false;
};

$navBar($page.navBar);
