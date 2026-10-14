import { onBeforeUnmount, onMounted, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import { navigate } from "vike/client/router";

/**
 * Keeps a mobile drawer in sync with browser history (pattern learnt from mail/admin-sidebar):
 * - opening pushes a same-URL entry, so the system back button / swipe closes the drawer instead of leaving the page;
 * - closing it any other way (overlay, Esc, X) pops that entry again, so no empty history entry is left behind;
 * - following a link from inside the drawer replaces that entry with the target page (no race with history.back()).
 * Vike treats user pushState entries as same-page and does not re-render on pop.
 */
let drawerSeed = 0;

export function useDrawerHistory(open: Ref<boolean>, setOpen: (value: boolean) => void, enabled: MaybeRefOrGetter<boolean> = true) {
  const id = `d${++drawerSeed}`;
  let pushed = false;

  const ownsTop = () => {
    const state = window.history.state as Record<string, unknown> | null;
    return Boolean(state && state.__mkDrawer === id);
  };

  watch(open, (value) => {
    if (typeof window === "undefined") return;
    if (value && !pushed && toValue(enabled)) {
      pushed = true;
      window.history.pushState({ __mkDrawer: id }, "", window.location.href);
    } else if (!value && pushed) {
      pushed = false;
      if (ownsTop()) window.history.back();
    }
  });

  function onPopState() {
    if (pushed && !ownsTop()) {
      pushed = false;
      setOpen(false);
    }
  }

  onMounted(() => window.addEventListener("popstate", onPopState));
  onBeforeUnmount(() => {
    window.removeEventListener("popstate", onPopState);
    if (pushed && ownsTop()) window.history.back();
    pushed = false;
  });

  /** Close the drawer and go to `href`. Returns false when the click should be left to the browser (modifier keys, new tab). */
  function navigateFromDrawer(href: string, event?: MouseEvent) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return false;
    event?.preventDefault();
    const replace = pushed && ownsTop();
    pushed = false;
    setOpen(false);
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin) {
      window.location.assign(target.href);
      return true;
    }
    if (target.pathname + target.search === window.location.pathname + window.location.search) {
      if (replace) window.history.back();
      if (target.hash) window.setTimeout(() => document.querySelector(target.hash)?.scrollIntoView({ behavior: "smooth" }), 60);
      return true;
    }
    void navigate(target.pathname + target.search + target.hash, { overwriteLastHistoryEntry: replace });
    return true;
  }

  return { navigateFromDrawer };
}
