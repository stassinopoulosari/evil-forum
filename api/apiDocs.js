export const DOCS = {
  NEW_POST: {
    error:
      "You must include a request body with the below parameters to this endpoint.",
    parameters: {
      post: {
        title: "Post title",
        link: "What this post links to (may NOT have text as well as link)",
        text: "Text of this post (may NOT have link as well as text)",
      },
    },
  },
  NEW_COMMENT: {
    error: "You must POST to this endpoint.",
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
      "You must include a request body with the below parameters to this endpoint.",
    parameters: {
      postID: "ID of the post to edit",
      text: "New text to place in the post",
    },
  },
  DELETE_POST: {},
  DELETE_COMMENT: {},
  EDIT_COMMENT: {
    error:
      "You must include a request body with the below parameters to this endpoint.",
    parameters: {
      commentID: "ID of the comment to edit",
      content: "New content to place in the comment",
    },
  },
  VOTE_COMMENT: {
    error:
      "You must include a request body with the below parameters to this endpoint.",
    parameters: {
      commentID: "ID of the comment on which you are voting",
      voteValue: "0, 1, or -1",
    },
  },
  VOTE_POST: {
    error:
      "You must include a request body with the below parameters to this endpoint.",
    parameters: {
      postID: "ID of the post on which you are voting",
      voteValue: "0, 1, or -1",
    },
  },
};
