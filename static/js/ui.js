// ui.js from
// https://github.com/stassinopoulosari/UBSACRUD/blob/main/shared/ui.js

export const addEllipsis = ($parent) => {
    if (
      [].some.call($parent.children, ($child) =>
        $child.classList.contains("loading-ellipsis"),
      )
    ) {
      [].filter
        .call($parent.children, ($child) =>
          $child.classList.contains("loading-ellipsis"),
        )
        .map(($ellipsis) => $ellipsis.classList.remove("stopped"));
      return $parent;
    }
    $parent.appendChild(
      classes(update(make("div"), { innerText: "..." }), ["loading-ellipsis"]),
    );
    return $parent;
  },
  separator = () => update(make("span"), { innerHTML: "&nbsp;" }),
  find = (id) => document.getElementById(id),
  make = (el) => document.createElement(el),
  stopEllipsis = ($el) => {
    if ($el.classList.contains("loading-ellipsis")) {
      $el.classList.add("stopped");
      return $el;
    }
    [].filter
      .call($el.children, ($child) =>
        $child.classList.contains("loading-ellipsis"),
      )
      .map(($ellipsis) => $ellipsis.classList.add("stopped"));
    return $el;
  },
  removeEllipsis = ($el) => {
    if ($el.classList.contains("loading-ellipsis")) {
      $el.remove();
    }
    [].filter
      .call($el.children, ($child) =>
        $child.classList.contains("loading-ellipsis"),
      )
      .map(($ellipsis) => $ellipsis.remove());
    return $el;
  },
  update = ($el, values) => {
    for (const valueKey in values) {
      $el[valueKey] = values[valueKey];
    }
    return $el;
  },
  style = ($el, values) => {
    for (const valueKey in values) {
      $el.style[valueKey] = values[valueKey];
    }
    return $el;
  },
  attr = ($el, values) => {
    for (const valueKey in values) {
      if (values[valueKey] === undefined) {
        $el.removeAttribute(valueKey);
      } else {
        $el.setAttribute(valueKey, values[valueKey]);
      }
    }
    return $el;
  },
  classes = ($el, addClasses, removeClasses) => {
    (addClasses ?? []).forEach((className) => $el.classList.add(className));
    (removeClasses ?? []).forEach((className) =>
      $el.classList.remove(className),
    );
    return $el;
  },
  // removeClasses = ($el, classes) => {
  //   classes.forEach((className) => $el.classList.remove(className));
  //   return $el;
  // },
  data = ($el, values) => {
    for (const valueKey in values) {
      $el.dataset[valueKey] = values[valueKey];
    }
    return $el;
  },
  children = ($el, $children) => {
    $children.forEach(($child) => $el.appendChild($child));
    return $el;
  },
  replaceContent = ($el, $children) => {
    $el.innerText = "";
    children($el, $children);
    return $el;
  },
  make$Page = (prefix) => {
    const $page = {};
    const $pageElements = [].filter.call(
      document.querySelectorAll("*"),
      ($el) => $el.id !== undefined && $el.id.startsWith(prefix),
    );
    $pageElements.forEach(($el) => {
      const id = $el.id,
        idComponents = id.split("-").slice(1);
      $page[idComponents.join("_")] = $el;
    });
    return $page;
  },
  getSynonym = (withArticle) => {
    const evilSynonyms = [
      "evil",
      "malevolent",
      "sinister",
      "inauspicious",
      "wicked",
      "vile",
      "dishonourable",
      "sinful",
      "immoral",
      "odious",
      "dastardly",
      "perilous",
      "pernicious",
      "smelly",
      "hostile",
      "miserable",
      "grim",
      "bad",
    ];
    const synonym =
      evilSynonyms[Math.floor(Math.random() * evilSynonyms.length)];
    return `${withArticle ? `a${/^[aeiou]/.test(synonym) ? "n" : ""} ` : ""}${synonym}`;
  },
  renderTime = (timestamp) => {
    const date = new Date(Date.parse(timestamp)),
      secondsAgo = (Date.now() - date.getTime()) / 1000,
      minutesAgo = secondsAgo / 60,
      hoursAgo = minutesAgo / 60,
      daysAgo = hoursAgo / 24,
      dayOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][date.getDay()],
      fullDate = date.toLocaleDateString(),
      todayFullDate = new Date().toLocaleDateString(),
      time = date.toLocaleTimeString();
    let evil = [];
    if (date.getDate() === 13) {
      evil.push(`on ${getSynonym(true)} day`);
    } else if (date.getHours() === 13) {
      evil.push(`at ${getSynonym(true)} hour`);
    } else if (date.getMinutes() === 13) {
      evil.push(`at ${getSynonym(true)} time`);
    } else if (date.getSeconds() === 13) {
      evil.push(`at ${getSynonym(true)} moment`);
    }
    if (evil.length !== 0) {
      return evil.join(" ");
    }
    if (secondsAgo < 30) {
      return "a few seconds ago";
    } else if (secondsAgo < 60) {
      return `${Math.floor(secondsAgo)} seconds ago`;
    } else if (minutesAgo < 2) {
      return "a minute or so ago";
    } else if (minutesAgo < 5) {
      return "a few minutes ago";
    } else if (minutesAgo < 60) {
      return `${Math.floor(minutesAgo)} minutes ago`;
    } else if (hoursAgo < 1.5) {
      return `about an hour ago`;
    } else if (hoursAgo < 5) {
      return `about ${Math.round(hoursAgo)} hours ago`;
    } else if (daysAgo < 1 && fullDate === todayFullDate) {
      return `at ${time}`;
    } else if (daysAgo < 1) {
      return `yesterday at ${time}`;
    } else if (daysAgo < 1.25) {
      return `about a day ago`;
    } else if (daysAgo < 6) {
      return `${dayOfWeek} at ${time}`;
    } else {
      return `${fullDate} at ${time}`;
    }
  },
  seriousRenderTime = (timestamp) =>
    new Date(Date.parse(timestamp)).toLocaleString();

// Progress ellipsis elements
const progressEllipsis = () => {
  [].forEach.call(
    document.getElementsByClassName("loading-ellipsis"),
    ($ellipsisElement) => {
      if ($ellipsisElement.classList.contains("stopped")) {
        $ellipsisElement.innerText = "•••";
        return;
      }
      var innerText = $ellipsisElement.innerText;
      if (innerText === "º••") {
        innerText = "•º•";
      } else if (innerText === "•º•") {
        innerText = "••º";
      } else {
        innerText = "º••";
      }
      $ellipsisElement.innerText = innerText;
    },
  );
};
setInterval(progressEllipsis, 500);
progressEllipsis();

[].forEach.call(document.getElementsByClassName("synonym"), ($el) => {
  $el.innerText = getSynonym();
});
