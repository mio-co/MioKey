import { onBeforeUnmount, onMounted, ref } from "vue";

/** Tracks whether the page is scrolled and whether the user is scrolling down (for hide-on-scroll headers). */
export function useScrollDirection(threshold = 8) {
  const scrolled = ref(false);
  const hidden = ref(false);
  let lastY = 0;
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    scrolled.value = y > 4;
    if (Math.abs(y - lastY) < threshold) return;
    hidden.value = y > lastY && y > 160;
    lastY = y;
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }
  onMounted(() => { lastY = window.scrollY; update(); window.addEventListener("scroll", onScroll, { passive: true }); });
  onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
  return { scrolled, hidden };
}
