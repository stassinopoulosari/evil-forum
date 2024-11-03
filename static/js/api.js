import {
  deleteWithSession,
  getWithSession,
  postWithSession,
  putWithSession,
} from "./network.js";
export const createPost = async (session, post) => {
    try {
      return (
        await postWithSession(session, `/api/posts/new`, {
          post: post,
        })
      ).json;
    } catch (error) {
      throw error;
    }
  },
  createComment = async (session, postID, comment) =>
    await postWithSession(session, `/api/comments/new`, {
      postID: postID,
      comment: comment,
    }),
  editComment = async (session, commentID, content) =>
    await putWithSession(session, `/api/comments/${commentID}/edit`, {
      content: content,
    }),
  editPost = async (session, postID, text) =>
    await putWithSession(session, `/api/posts/${postID}/edit`, {
      text: text,
    }),
  deleteComment = async (session, commentID) =>
    await deleteWithSession(session, `/api/comments/${commentID}/delete`),
  deletePost = async (session, postID) =>
    await deleteWithSession(session, `/api/posts/${postID}/delete`),
  voteOnPost = async (session, postID, vote) =>
    await postWithSession(session, `/api/posts/${postID}/vote`, {
      voteValue: vote,
    }),
  voteOnComment = async (session, postID, vote) =>
    await postWithSession(session, `/api/comments/${postID}/vote`, {
      voteValue: vote,
    }),
  getMe = async (session) => {
    const localMeKey = `evil-forum-me`;
    let savedMe = undefined;
    try {
      savedMe = JSON.parse(localStorage.getItem(localMeKey) ?? ``);
    } catch {}
    if (
      savedMe !== undefined &&
      (Date.now() - Date.parse(savedMe.lastSaved)) / 1000 <= 30 * 60
    )
      return savedMe.content;
    try {
      let meResponse = await getWithSession(session, `/api/user/me`),
        meContent = meResponse.json;
      localStorage.setItem(
        localMeKey,
        JSON.stringify({
          lastSaved: new Date(),
          content: meContent,
        }),
      );
      return meContent;
    } catch {
      localStorage.setItem(localMeKey, undefined);
      return undefined;
    }
  };
