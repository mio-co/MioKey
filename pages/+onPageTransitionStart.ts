import { startNavProgress } from "@/lib/ui/nav-progress";

// Instant feedback for client-side navigations (see lib/ui/nav-progress.ts).
export function onPageTransitionStart() {
  startNavProgress();
}
