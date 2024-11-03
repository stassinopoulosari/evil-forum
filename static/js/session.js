import { getWithSession } from "./network.js";

const sessionKey = "evil-forum-session";

export const loadSessionFromLocalStorage = () => {
    if (localStorage.getItem(sessionKey) === null) return undefined;
    try {
      const sessionString = localStorage.getItem(sessionKey),
        sessionObject = JSON.parse(sessionString);
      if (Date.parse(sessionObject.session.expirationDate) < Date.now()) {
        deleteSessionFromLocalStorage();
        return undefined;
      }
      return sessionObject;
    } catch {
      return undefined;
    }
  },
  saveSessionToLocalStorage = (sessionObject) => {
    if (
      sessionObject === undefined ||
      typeof sessionObject !== "object" ||
      ["session", "userID"].some(
        (key) => !Object.keys(sessionObject).includes(key),
      )
    )
      throw "Invalid session object";
    localStorage.setItem(sessionKey, JSON.stringify(sessionObject));
  },
  deleteSessionFromLocalStorage = () => {
    localStorage.setItem(sessionKey, undefined);
  },
  generateHeadersFromSession = (sessionObject) => ({
    "x-evil-forum-session-id": sessionObject.session.sessionID,
    "x-evil-forum-user-id": sessionObject.userID,
  }),
  refreshSession = async () => {
    try {
      const localSession = getCurrentSession(),
        sessionResponse = await getWithSession(localSession, "./auth/session");
      localSession.session.expirationDate = sessionResponse.json.sessionExpires;
      saveSessionToLocalStorage(localSession);
      return true;
    } catch (error) {
      deleteSessionFromLocalStorage();
      console.error(error);
      return false;
    }
  },
  getCurrentSession = async () => {
    if (loadSessionFromLocalStorage() === undefined) return undefined;
    if (
      Date.parse(loadSessionFromLocalStorage().session.expirationDate) -
        Date.now() <
      30 * 60
    )
      await refreshSession();
    return loadSessionFromLocalStorage();
  };
