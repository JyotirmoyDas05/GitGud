import { useSyncExternalStore } from "react";

/**
 * Hash routing in ~30 lines.
 *
 * The app has 16 routes and no loaders, nested layouts, or data fetching on
 * navigation. A router library would be more configuration than this is code.
 */

export type Route =
  | { name: "home" }
  | { name: "challenge"; id: string }
  | { name: "page"; page: "about" | "dictionary" | "resources" }
  | { name: "finale" };

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (!path) return { name: "home" };

  const [head, tail] = path.split("/");

  if (head === "challenge" && tail) return { name: "challenge", id: tail };
  if (head === "finale") return { name: "finale" };
  if (head === "about" || head === "dictionary" || head === "resources") {
    return { name: "page", page: head };
  }
  return { name: "home" };
}

export function href(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "challenge":
      return `#/challenge/${route.id}`;
    case "page":
      return `#/${route.page}`;
    case "finale":
      return "#/finale";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  return parse(hash);
}

export function navigate(route: Route) {
  window.location.hash = href(route);
  // Hash navigation does not reset scroll, and landing mid-page on a
  // challenge you have not read is disorienting.
  window.scrollTo({ top: 0 });
}
