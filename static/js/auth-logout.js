import { signOut } from "./api.js";
import { deleteSessionFromLocalStorage, getCurrentSession } from "./session.js";
import { make$Page } from "./ui.js";

const $page = make$Page("authLogout");
try {
  const currentSession = await getCurrentSession();
  if (currentSession === undefined) throw "Not signed in";
  await signOut(currentSession);
  deleteSessionFromLocalStorage();
  location.assign("/?message=loggedOut");
} catch (err) {
  console.error(err);
  $page.error.innerText =
    "Sorry! Something went wrong signing you out. Redirecting to the home page.";
  setTimeout(() => location.assign("/?message=logoutError"), 1000);
}
