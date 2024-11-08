import {
  deletePost,
  editComment,
  getMe,
  voteOnComment,
  voteOnPost,
} from "./api.js";
import { getCurrentSession } from "./session.js";
import {
  addEllipsis,
  attr,
  children,
  classes,
  make,
  renderTime,
  replaceContent,
  separator,
  seriousRenderTime,
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
    let $replyButton, $replyWidget;
    if (!hideReply) {
      $replyButton = update(
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
            style($replyWidget, { display: "flex" });
            return false;
          },
        },
      );
      $replyWidget = style(
        $newCommentWidget(postID, comment.comment_id, $replyButton),
        { display: "none" },
      );
    }
    let isEditing = false;
    console.log(comment);
    const $editButton = update(make(comment.comment_edited_at ? "span" : "a"), {
        innerText: "edit",
        href: "#",
        title: comment.comment_edited_at
          ? "comments can only be edited once"
          : "edit comment",
        onclick: async (e) => {
          e.preventDefault();
          if (!isEditing) {
            isEditing = true;
            $commentParagraph.contentEditable = true;
            $commentParagraph.focus();
            $editButton.innerText = "save";
          } else {
            isEditing = false;
            const newCommentText = $commentParagraph.innerText.trim();
            if (newCommentText.length < 1) {
              isEditing = true;
              $editButton.innerText = "comment can't be empty :)";
              return false;
            }
            $editButton.innerText = "saving...";
            attr($editButton, { disabled: true });
            try {
              await editComment(
                await getCurrentSession(),
                comment.comment_id,
                newCommentText,
              );
              $commentParagraph.contentEditable = false;
              $editButton.innerText = "saved";
            } catch (err) {
              console.error(err);
              isEditing = false;
              $editButton.innerText = "failed to save. try again.";
              attr($editButton, { disabled: undefined });
            }
          }
        },
      }),
      $commentParagraph = update(make("p"), {
        innerText: comment.comment_content,
      });
    return children(classes(make("div"), ["comment"]), [
      children(classes(make("div"), ["comment-body"]), [
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
          $commentParagraph,
          children(make("div"), [
            update(make("i"), {
              innerText: `${renderTime(comment.comment_timestamp)}${comment.comment_edited_at ? "*" : ""}`,
              title: comment.comment_edited_at
                ? `edited ${renderTime(comment.comment_edited_at)}`
                : seriousRenderTime(comment.comment_timestamp),
            }),
            ...(!hideReply
              ? [
                  update(make("span"), {
                    innerText: " • ",
                  }),
                  $replyButton,
                ]
              : []),
            ...(comment.comment_mine === true
              ? [
                  update(make("span"), {
                    innerText: " • ",
                  }),
                  $editButton,
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
        ]),
      ]),
      ...(!hideReply ? [$replyWidget] : []),
      ...(getChildrenOf !== undefined
        ? [
            children(
              classes(make("div"), ["comment-children"]),
              getChildrenOf(comment.comment_id).map((childComment) =>
                $commentWidget(
                  childComment,
                  getChildrenOf,
                  disableReply,
                  hideReply,
                  $newCommentWidget,
                  postID,
                ),
              ),
            ),
          ]
        : []),
    ]);
  },
  $dummyVoteWidget = () => $voteWidget(">:3", true, () => {}, true),
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
    return "self";
  }
};
export const $postWidget = (post, dummyVote) =>
  children(classes(make("div"), ["post"]), [
    // Votes
    !dummyVote
      ? $voteWidget(
          post.post_votes,
          post.vote_positive,
          async (voteValue) => {
            voteOnPost(await getCurrentSession(), post.post_id, voteValue);
          },
          post.post_deleted,
        )
      : $dummyVoteWidget(),
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
        update(make("i"), {
          innerText: `${renderTime(post.post_timestamp)}${post.post_edited_at ? "*" : ""}`,
          title: post.post_edited_at
            ? `edited ${renderTime(post.post_edited_at)}`
            : seriousRenderTime(post.post_timestamp),
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
                    update(make(post.post_edited_at ? "span" : "a"), {
                      innerText: "edit",
                      href: `/posts/${post.post_id}/edit`,
                      disabled: post.post_edited_at !== null,
                      title: post.post_edited_at
                        ? "posts may only be edited once"
                        : "edit post",
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
  const $authLinks = {
    userLink: children(make("a"), [
      update(make("span"), { innerText: "Loading" }),
      addEllipsis(make("span")),
    ]),
    newPostLink: children(make("a"), [
      update(make("span"), { innerText: "Loading" }),
      addEllipsis(make("span")),
    ]),
    logoutLink: children(make("a"), [
      update(make("span"), { innerText: "Loading" }),
      addEllipsis(make("span")),
    ]),
  };
  children($el, [
    children(update(make("a"), { href: "/" }), [
      update(make("img"), { src: "/assets/evil-forum.svg", alt: "evil forum" }),
    ]),
    classes(separator(), ["spacer"]),
    $authLinks.userLink,
    $authLinks.newPostLink,
    $authLinks.logoutLink,
  ]);
  getCurrentSession().then((currentSession) => {
    if (currentSession !== undefined) {
      getMe(currentSession).then((meContent) =>
        update($authLinks.userLink, {
          innerText: `signed in as ${meContent.user_displayname}`,
          href: `/users/${meContent.user_username}`,
        }),
      );
      update(
        replaceContent($authLinks.newPostLink, [
          update(make("img"), { src: "/assets/icon/plus.svg" }),
        ]),
        { href: "/posts/new", title: "Make a new post" },
      );
      update(
        replaceContent($authLinks.logoutLink, [
          update(make("img"), { src: "/assets/icon/logout.svg" }),
        ]),
        { href: "/auth/logout", title: "Sign out" },
      );
      return;
    }
    update($authLinks.userLink, {
      innerText: "sign in with Google",
      href: `/auth/google`,
    });
    $authLinks.logoutLink.remove();
    $authLinks.newPostLink.remove();
    return;
  });
};

// <b></b>
// <a href="/posts/new" id="homepage-newPostButton">+ new post</a>
// <a href="/auth/google" id="homepage-signInButton"
//     >sign in with Google</a
// >
// <a id="homepage-userLink"></a>
