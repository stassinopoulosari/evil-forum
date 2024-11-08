import { getWithSession } from "./network.js";
import { getCurrentSession } from "./session.js";
import { $navBar, $postWidget } from "./shared-components.js";
import { children, classes, make, make$Page, update } from "./ui.js";

const $page = make$Page("homepage");

const currentSession = await getCurrentSession();

const handleMessage = () => {
  const locationURL = new URL(location);
  if (locationURL.searchParams.size === 0) return;
  history.pushState({}, "", ".");
  if (locationURL.searchParams.get("message") === null) return;
};

const $noPostPlaceholder = children(
  classes(make("div"), ["no-post-placeholder"]),
  [
    update(make("h2"), { innerText: "No posts yet :(" }),
    children(
      update(make("a"), {
        href: currentSession === undefined ? "/auth/google" : "/posts/new",
      }),
      [
        update(make("h3"), {
          innerText:
            currentSession === undefined
              ? "sign in to change that"
              : "make one?",
        }),
      ],
    ),
  ],
);

getWithSession(currentSession, "/api/homepage")
  .then((homepageResponse) => {
    if (!homepageResponse.json)
      throw "Unable to parse JSON from homepage response";
    const homepageJSON = homepageResponse.json;
    console.log(homepageJSON);
    if (homepageJSON.status === true) {
      const posts = homepageJSON.homepage;
      update($page.postsContainer, { innerHTML: "" });
      children(
        $page.postsContainer,
        posts.length > 0
          ? posts.map((post) => $postWidget(post))
          : [$noPostPlaceholder],
      );
    } else {
      throw "Homepage did not load";
    }
  })
  .catch((homepageError) => {
    console.error(homepageError);
    // TODO: Homepage error
  });

$navBar($page.navBar);
handleMessage();
