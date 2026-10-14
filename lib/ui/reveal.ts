/**
 * Scroll reveal (Rawjoy-style fade-up with expo-out easing). Elements carry the `mk-reveal` class in
 * their SSR markup; the hidden state only applies under `html.mk-js` (set by an inline script before
 * first paint), so content is never hidden without JavaScript. See components/storefront/Reveal.vue.
 */
let observer: IntersectionObserver | null = null;

export function observeReveal(el: Element) {
  if (typeof IntersectionObserver === "undefined") { el.classList.add("is-in"); return () => undefined; }
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer?.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
  observer.observe(el);
  return () => observer?.unobserve(el);
}
