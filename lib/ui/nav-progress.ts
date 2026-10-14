/**
 * Thin top progress bar for client-side navigations (Vike onPageTransitionStart / onPageTransitionEnd).
 * A click on a link used to give no feedback while the next page's pageContext (server data + guard) was
 * fetched, which read as "the click did nothing". Plain DOM, no Vue: it lives outside the app root and costs
 * nothing until the first navigation. Shown only after a short delay so prefetched (instant) navigations never flash.
 */
const SHOW_DELAY_MS = 80;
let bar: HTMLDivElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let trickleTimer: ReturnType<typeof setInterval> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let progress = 0;

function element() {
  if (bar?.isConnected) return bar;
  bar = document.createElement("div");
  bar.className = "mk-nav-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  return bar;
}

function render() {
  if (bar) bar.style.transform = `scaleX(${progress})`;
}

function clearTimers() {
  if (showTimer) clearTimeout(showTimer);
  if (trickleTimer) clearInterval(trickleTimer);
  if (hideTimer) clearTimeout(hideTimer);
  showTimer = trickleTimer = hideTimer = undefined;
}

export function startNavProgress() {
  if (typeof document === "undefined") return;
  clearTimers();
  showTimer = setTimeout(() => {
    const el = element();
    progress = 0.08;
    el.dataset.state = "loading";
    render();
    // Ease towards 90% and wait there for the transition end.
    trickleTimer = setInterval(() => { progress += (0.9 - progress) * 0.12; render(); }, 200);
  }, SHOW_DELAY_MS);
}

export function endNavProgress() {
  if (typeof document === "undefined") return;
  const visible = !!bar && bar.dataset.state === "loading";
  clearTimers();
  if (!visible || !bar) return;
  progress = 1;
  render();
  bar.dataset.state = "done";
  hideTimer = setTimeout(() => {
    if (!bar) return;
    bar.dataset.state = "";
    progress = 0;
    render();
  }, 320);
}
