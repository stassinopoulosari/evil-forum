import { get } from "./network.js";
import { saveSessionToLocalStorage } from "./session.js";

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
