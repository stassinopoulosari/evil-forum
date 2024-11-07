import { get } from "./network.js";
import { saveSessionToLocalStorage } from "./session.js";
import { make$Page } from "./ui.js";

const $page = make$Page("authGoogle");
try {
  const createSessionResponse = await get(
    `/auth/createSession${location.search}`,
  );
  history.pushState({}, undefined, "/auth/google");
  if (
    createSessionResponse.status !== 200 ||
    createSessionResponse.json === undefined
  ) {
    location.assign("/?loginError");
  }

  saveSessionToLocalStorage(createSessionResponse.json);
  location.assign("/");
} catch (err) {
  $page.error.innerText =
    "Sorry! Something went wrong authenticating you. Redirecting to the home page.";
  setTimeout(() => location.assign("/"), 1000);
}
