import { get, getWithSession } from "./network.js";
import {
  deleteSessionFromLocalStorage,
  getCurrentSession,
  saveSessionToLocalStorage,
} from "./session.js";
import { make$Page } from "./ui.js";

const $page = make$Page("authLogout");
try {
  const currentSession = await getCurrentSession();
  if (currentSession === undefined) throw "Not signed in";
  await getWithSession(currentSession, "/auth/destroy-session");
  deleteSessionFromLocalStorage();
  location.assign("/?message=loggedOut");
} catch (err) {
  console.error(err);
  $page.error.innerText =
    "Sorry! Something went wrong signing you out. Redirecting to the home page.";
  setTimeout(() => location.assign("/?message=logoutError"), 1000);
}
