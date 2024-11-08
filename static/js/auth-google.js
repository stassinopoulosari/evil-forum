import { get } from "./network.js";
import { saveSessionToLocalStorage } from "./session.js";
import { make$Page } from "./ui.js";

const $page = make$Page("authGoogle");
try {
  const search = location.search;
  history.pushState({}, undefined, "/auth/google");
  const createSessionResponse = await get(`/auth/create-session${search}`);
  if (
    createSessionResponse.status !== 200 ||
    createSessionResponse.json === undefined
  ) {
    throw "Could not sign in";
  }
  saveSessionToLocalStorage(createSessionResponse.json);
  location.assign("/?message=loggedIn");
} catch (err) {
  $page.error.innerText =
    "Sorry! Something went wrong authenticating you. Redirecting to the home page.";
  setTimeout(() => location.assign("/?message=loginError"), 1000);
}
