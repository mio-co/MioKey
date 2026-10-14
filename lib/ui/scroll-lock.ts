import { onBeforeUnmount, watch, type Ref } from "vue";

let locks = 0;
let saved: { overflow: string } | null = null;

function lock() {
  if (locks++ > 0) return;
  const body = document.body;
  saved = { overflow: body.style.overflow };
  body.style.overflow = "hidden";
}

function unlock() {
  if (locks === 0 || --locks > 0) return;
  if (saved) document.body.style.overflow = saved.overflow;
  saved = null;
}

/** Locks page scroll while `active` is true (ref-counted; html scrollbar-gutter: stable keeps layout from shifting). */
export function useScrollLock(active: Ref<boolean>) {
  let held = false;
  watch(active, (value) => {
    if (typeof document === "undefined") return;
    if (value && !held) { held = true; lock(); }
    else if (!value && held) { held = false; unlock(); }
  }, { immediate: true });
  onBeforeUnmount(() => { if (held) { held = false; unlock(); } });
}
