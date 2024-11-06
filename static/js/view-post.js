import { createComment, deleteComment, voteOnComment } from "./api.js";
import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postElement, $voteWidget } from "./shared-components.js";
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

const $commentWidget = (comment, getChildrenOf, disableReply) => {
    const $replyButton = update(
        attr(make("a"), {
          disabled:
            currentSession === undefined ||
            comment.comment_deleted ||
            disableReply
              ? true
              : undefined,
        }),
        {
          href: "#",
          innerText: "reply",
          onclick: () => {
            attr($replyButton, { disabled: true });
            style($replyWidget, { display: "block" });
            return false;
          },
        },
      ),
      $replyWidget = style(
        $newCommentWidget(postID, comment.comment_id, $replyButton),
        { display: "none" },
      );
    return children(classes(make("div"), ["comment"]), [
      $voteWidget(
        comment.comment_votes,
        comment.vote_positive,
        async (voteValue) => {
          voteOnComment(
            await getCurrentSession(),
            comment.comment_id,
            voteValue,
          );
        },
        comment.comment_deleted ? true : false,
      ),
      children(make("div"), [
        update(make("a"), {
          innerText: comment.user_displayname ?? "[nobody]",
          href:
            comment.user_username === null
              ? ""
              : `/users/${comment.user_username}`,
        }),
        update(make("p"), {
          innerText: comment.comment_content,
        }),
        children(make("div"), [
          $replyButton,
          ...(comment.comment_mine === true
            ? [
                update(make("span"), {
                  innerText: " • ",
                }),
                update(make("a"), {
                  innerText: "delete",
                  href: `#`,
                  onclick: () => {
                    if (
                      confirm(
                        "Are you sure you would like to delete this comment",
                      )
                    )
                      (async () => {
                        await deleteComment(
                          await getCurrentSession(),
                          comment.comment_id,
                        );
                        alert("Comment deleted");
                        // TODO show comment deleted visually
                      })();
                    return false;
                  },
                }),
              ]
            : []),
        ]),
        $replyWidget,
        children(classes(make("div"), ["content"]), [
          ...(getChildrenOf !== undefined
            ? getChildrenOf(comment.comment_id).map((childComment) =>
                $commentWidget(childComment, getChildrenOf, disableReply),
              )
            : []),
        ]),
      ]),
    ]);
  },
  $newCommentWidget = (postID, replyTo, $replyButton) => {
    const $commentContent = update(make("textarea"), { required: true }),
      $newCommentContainer = make("form");
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
        update(make("input"), { type: "submit", value: "post" }),
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
      ],
    );
  };

(async () => {
  try {
    const postInfo = await getWithSession(
        currentSession,
        `/api/posts/${postID}`,
      ),
      post = postInfo.json.post;
    children($page.postSummary, [
      $postElement(post),
      ...(post.post_text !== null
        ? [
            update(classes(make("p"), ["content"]), {
              innerText: post.post_text,
            }),
          ]
        : []),
      ...((post.post_deleted ? true : false || post.post_locked ? true : false)
        ? []
        : [$newCommentWidget(postID)]),
    ]);
    const comments = (
        await getWithSession(currentSession, `/api/posts/${postID}/comments`)
      ).json.comments,
      getChildrenOf = (commentID) =>
        comments.filter((comment) => comment.comment_replyto === commentID),
      firstLevelComments = getChildrenOf(null);
    children(
      $page.comments,
      firstLevelComments.map((comment) =>
        $commentWidget(
          comment,
          getChildrenOf,
          post.post_deleted ? true : false || post.post_locked ? true : false,
        ),
      ),
    );
    console.log(comments);
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
