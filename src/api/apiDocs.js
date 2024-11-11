export const DOCS = {
    NEW_POST: {
      error:
        "You must POST a request body with the below parameters to this endpoint.",
      method: "POST",
      path: "/api/posts/new",
      parameters: {
        post: {
          title: "Post title",
          link: "What this post links to (may NOT have text as well as link)",
          text: "Text of this post (may NOT have link as well as text)",
        },
      },
    },
    NEW_COMMENT: {
      error:
        "You must POST a request body with the below parameters to this endpoint.",
      method: "POST",
      path: "/api/comments/new",
      parameters: {
        postID: "ID of the post on which you are commenting",
        comment: {
          content: "Text content of your comment",
          replyTo: "(Optional) ID of the comment to which you are replying",
        },
      },
    },
    EDIT_POST: {
      error:
        "You must PUT a request body with the below parameters to this endpoint.",
      method: "PUT",
      path: "/api/posts/${postID}/edit",
      parameters: {
        postID: "ID of the post to edit",
        text: "New text to place in the post",
      },
    },
    DELETE_POST: {
      method: "DELETE",
      path: "/api/posts/${postID}/delete",
    },
    DELETE_COMMENT: {
      method: "DELETE",
      path: "/api/comments/${commentID}/delete",
    },
    EDIT_COMMENT: {
      error:
        "You must PUT a request body with the below parameters to this endpoint.",
      method: "PUT",
      path: "/api/comments/${commentID}/edit",
      parameters: {
        commentID: "ID of the comment to edit",
        content: "New content to place in the comment",
      },
    },
    VOTE_COMMENT: {
      error:
        "You must include a request body with the below parameters to this endpoint.",
      method: "POST",
      path: "/api/comments/${commentID}/vote",
      parameters: {
        commentID: "ID of the comment on which you are voting",
        voteValue: "0, 1, or -1",
      },
    },
    VOTE_POST: {
      error:
        "You must include a request body with the below parameters to this endpoint.",
      method: "POST",
      path: "/api/posts/${postID}/vote",
      parameters: {
        postID: "ID of the post on which you are voting",
        voteValue: "0, 1, or -1",
      },
    },
    SET_NOTIFICATION_SETTINGS: {
      error:
        "You must include a request body with the below parameters to this endpoint.",
      method: "PUT",
      path: "/api/settings/notifications",
      parameters: {
        postReply: "Receive e-mails for replies to your post",
        commentReply: "Receive e-mails for replies to your comments",
      },
    },
  },
  rejectWithDocs = (docs) => (req, res) => {
    res.status(400);
    res.json({
      success: false,
      ...docs,
    });
  };
