import { $navBar } from "./shared-components.js";
import { make$Page } from "./ui.js";

const $page = make$Page("user");
$navBar($page.navBar);
