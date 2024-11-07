import { deletePost, getMe, voteOnComment, voteOnPost } from "./api.js";
import { getCurrentSession } from "./session.js";
import {
  addEllipsis,
  attr,
  children,
  classes,
  make,
  separator,
  style,
  update,
} from "./ui.js";

const loggedIn = (await getCurrentSession()) !== undefined;
export const $commentWidget = (
    comment,
    getChildrenOf,
    disableReply,
    hideReply,
    $newCommentWidget,
    postID,
  ) => {
    const $replyButton = update(
        attr(make("a"), {
          disabled:
            !loggedIn ||
            comment.comment_deleted ||
            comment.comment_chain_depth >= 5 ||
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
          ...(!hideReply ? [$replyButton] : []),
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
                $commentWidget(
                  childComment,
                  getChildrenOf,
                  disableReply,
                  hideReply,
                  $newCommentWidget,
                  postID,
                ),
              )
            : []),
        ]),
      ]),
    ]);
  },
  $voteWidget = (votes, vote_positive, onVote, disabled) => {
    const $parent = classes(make("div"), ["vote"]),
      $upButton = classes(
        update(make("button"), {
          innerText: "up",
          disabled: !loggedIn || disabled,
        }),
        ["vote-up", ...(vote_positive ? ["on"] : [])],
      ),
      $voteCounter = update(make("span"), {
        innerText: votes,
      }),
      $downButton = classes(
        update(make("button"), {
          innerText: "down",
          disabled: !loggedIn || disabled,
        }),
        ["vote-down", ...(vote_positive === false ? ["on"] : [])],
      ),
      takeClick = (positive) => {
        const $thisButton = positive ? $upButton : $downButton,
          $otherButton = positive ? $downButton : $upButton,
          currentVote = vote_positive,
          currentVoteValue = currentVote === positive ? 0 : 2 * positive - 1,
          voteDifference =
            currentVoteValue - (currentVote === null ? 0 : 2 * currentVote - 1);
        if (currentVoteValue === 0) {
          classes($thisButton, [], ["on"]);
          classes($otherButton, [], ["on"]);
        } else {
          classes($thisButton, ["on"], []);
          classes($otherButton, [], ["on"]);
        }
        vote_positive = currentVote === positive ? null : positive;
        votes += voteDifference;
        update($voteCounter, { innerText: votes });
        try {
          onVote(currentVoteValue);
        } catch (error) {
          // TODO: Failed to vote error
          console.error(error);
        }
      };
    $upButton.onclick = () => takeClick(true);
    $downButton.onclick = () => takeClick(false);
    return children($parent, [$upButton, $voteCounter, $downButton]);
  };

const getHostnameForURL = (url) => {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
};
export const $postElement = (post) =>
  children(classes(make("div"), ["post"]), [
    // Votes
    $voteWidget(
      post.post_votes,
      post.vote_positive,
      async (voteValue) => {
        voteOnPost(await getCurrentSession(), post.post_id, voteValue);
      },
      post.post_deleted,
    ),
    children(classes(make("div"), ["post-stack"]), [
      // Post title
      children(
        update(make("a"), {
          href: post.post_link ?? `/posts/${post.post_id}`,
        }),
        [
          update(make("h2"), {
            innerText: post.post_title ?? "",
          }),
          post.post_link
            ? update(make("span"), {
                innerText: `(${getHostnameForURL(post.post_link)})`,
              })
            : update(make("span"), { innerText: "(self)" }),
        ],
      ),
      // User Display name
      children(make("div"), [
        update(make("span"), {
          innerText: `posted by `,
        }),
        update(make("a"), {
          innerText: post.user_displayname ?? "[nobody]",
          href:
            post.user_username === null ? "" : `/users/${post.user_username}`,
        }),
        update(make("span"), {
          innerText: " • ",
        }),
        // Comments Link
        update(make("a"), {
          href: `/posts/${post.post_id}`,
          innerText: "comments",
        }),
        // If it is your own post
        ...(post.post_mine === true
          ? [
              ...(post.post_text !== null
                ? [
                    update(make("span"), {
                      innerText: " • ",
                    }),
                    update(make("a"), {
                      innerText: "edit",
                      href: `/posts/${post.post_id}/edit`,
                      disabled: post.post_modified_at !== null,
                    }),
                  ]
                : []),
              update(make("span"), {
                innerText: " • ",
              }),
              update(make("a"), {
                href: `/posts/${post.post_id}/delete`,
                innerText: "delete",
                onclick: () => {
                  if (
                    confirm("Are you sure you would like to delete this post")
                  )
                    (async () => {
                      await deletePost(await getCurrentSession(), post.post_id);
                      alert("Post deleted");
                      // TODO show post deleted visually
                    })();
                  return false;
                },
              }),
            ]
          : []),
      ]),
    ]),
  ]);

export const $navBar = ($el) => {
  const $link = children(make("a"), [
    update(make("span"), { innerText: "Loading" }),
    addEllipsis(make("span")),
  ]);
  children($el, [
    children(update(make("a"), { href: "/" }), [
      update(make("img"), { src: "/assets/evil-forum.svg", alt: "evil forum" }),
    ]),
    classes(separator(), ["spacer"]),
    $link,
    update(make("a"), { innerText: "+ new post", href: "/posts/new" }),
  ]);
  getCurrentSession().then((currentSession) => {
    if (currentSession !== undefined)
      getMe(currentSession).then((meContent) =>
        update($link, {
          innerText: `signed in as ${meContent.user_displayname}`,
          href: `/users/${meContent.user_username}`,
        }),
      );
    return update($link, {
      innerText: "sign in with Google",
      href: `/auth/google`,
    });
  });
};

// <b></b>
// <a href="/posts/new" id="homepage-newPostButton">+ new post</a>
// <a href="/auth/google" id="homepage-signInButton"
//     >sign in with Google</a
// >
// <a id="homepage-userLink"></a>
