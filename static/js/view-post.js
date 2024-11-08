import { createComment, deleteComment, voteOnComment } from "./api.js";
import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import {
  $commentWidget,
  $navBar,
  $postWidget,
  $voteWidget,
} from "./shared-components.js";
import {
  attr,
  children,
  classes,
  make,
  make$Page,
  style,
  update,
} from "./ui.js";

const $page = make$Page("viewPost");
$navBar($page.navBar);

const currentSession = await getCurrentSession(),
  postID = parseInt(
    location.pathname
      .split("/")
      .filter((path) => path !== "")
      .slice(-1)[0],
  ),
  renderPostNotFound = () =>
    children($page.postSummary, [
      update(make("h1"), { innerText: "This post was not found." }),
    ]);

if (isNaN(postID) || postID < 0) {
  renderPostNotFound();
  throw "Post ID is invalid";
}

const $newCommentWidget = (postID, replyTo, $replyButton) => {
  const $commentContent = update(
      currentSession === undefined
        ? classes(make("div"), ["textarea-placeholder"])
        : make("textarea"),
      {
        required: true,
        onkeyup: () => {
          if ($commentContent.value.trim().length < 1) {
            $submitButton.disabled = true;
          } else {
            $submitButton.disabled = false;
          }
        },
        innerHTML:
          currentSession === undefined
            ? "<span><a href='/auth/google'>Sign in</a>&nbsp;to leave a comment!</span>"
            : "",
        disabled: currentSession === undefined,
      },
    ),
    $submitButton = update(make("input"), {
      type: "submit",
      value: "post",
      disabled: true,
    }),
    $newCommentContainer = classes(make("form"), ["new-comment"]);
  return children(
    update($newCommentContainer, {
      onsubmit: (event) => {
        event.preventDefault();
        const comment = {
          postID: postID,
          content: $commentContent.value,
          ...(replyTo === undefined ? {} : { replyTo: replyTo }),
        };
        (async () => {
          try {
            await createComment(await getCurrentSession(), postID, comment);
            location.reload();
          } catch (err) {
            console.error(err);
          }
        })();
        return false;
      },
    }),
    [
      $commentContent,
      children(classes(make("div"), ["form-group"]), [
        $submitButton,
        ...(replyTo !== undefined
          ? [
              update(make("input"), {
                type: "button",
                value: "cancel",
                onclick: (e) => {
                  e.preventDefault();
                  style($newCommentContainer, { display: "none" });
                  attr($replyButton, { disabled: undefined });
                  return false;
                },
              }),
            ]
          : []),
      ]),
    ],
  );
};

(async () => {
  try {
    const postPromise = getWithSession(currentSession, `/api/posts/${postID}`),
      commentsPromise = getWithSession(
        currentSession,
        `/api/posts/${postID}/comments`,
      );
    const [postInfo, commentsResponse] = await Promise.all([
        postPromise,
        commentsPromise,
      ]),
      post = postInfo.json.post,
      comments = commentsResponse.json.comments,
      getChildrenOf = (commentID) =>
        comments.filter((comment) => comment.comment_replyto === commentID),
      firstLevelComments = getChildrenOf(null);
    children($page.postSummary, [
      $postWidget(post),
      ...(post.post_text !== null
        ? [
            update(classes(make("p"), ["post-content"]), {
              innerText: post.post_text,
            }),
          ]
        : []),
      ...((post.post_deleted ? true : false || post.post_locked ? true : false)
        ? []
        : [$newCommentWidget(postID)]),
    ]);
    children(
      $page.comments,
      firstLevelComments.map((comment) =>
        $commentWidget(
          comment,
          getChildrenOf,
          post.post_deleted ? true : false || post.post_locked ? true : false,
          post.post_deleted ? true : false || post.post_locked ? true : false,
          $newCommentWidget,
          postID,
        ),
      ),
    );
  } catch (error) {
    renderPostNotFound();
    throw error;
  }
})();

(async () => {
  try {
  } catch (error) {
    throw error;
  }
})();
