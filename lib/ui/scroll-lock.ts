import { onBeforeUnmount, watch, type Ref } from "vue";

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

function lock() {
  if (locks++ > 0) return;
  const body = document.body;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = "hidden";
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
}

function unlock() {
  if (locks === 0 || --locks > 0) return;
  if (saved) {
    document.body.style.overflow = saved.overflow;
    document.body.style.paddingRight = saved.paddingRight;
  }
  saved = null;
}

/** Locks page scroll while `active` is true (ref-counted, compensates the scrollbar width). */
export function useScrollLock(active: Ref<boolean>) {
  let held = false;
  watch(active, (value) => {
    if (typeof document === "undefined") return;
    if (value && !held) { held = true; lock(); }
    else if (!value && held) { held = false; unlock(); }
  }, { immediate: true });
  onBeforeUnmount(() => { if (held) { held = false; unlock(); } });
}
