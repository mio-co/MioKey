<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from "vue";
import { XIcon } from "@lucide/vue";
import { useScrollLock } from "@/lib/ui/scroll-lock";

/**
 * Side drawer shell (Rawjoy-measured motion): backdrop fades over .7s, panel slides over .5s
 * cubic-bezier(.7,0,.2,1). On >=1024px a right drawer floats 30px from the edge with a 20px radius.
 * Esc closes, page scroll is locked, focus moves into the panel and returns to the opener.
 */
const props = withDefaults(defineProps<{
  open: boolean;
  label: string;
  side?: "left" | "right" | "top";
  floating?: boolean;
  closeLabel?: string;
  panelClass?: string;
}>(), { side: "right", floating: true, closeLabel: "关闭", panelClass: "" });

const emit = defineEmits<{ "update:open": [value: boolean] }>();
const panel = ref<HTMLElement | null>(null);
const mounted = ref(false);
let opener: HTMLElement | null = null;

useScrollLock(toRef(props, "open"));

function close() { emit("update:open", false); }
const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Esc closes; Tab / Shift+Tab cycle inside the panel so keyboard focus never slips behind the modal. */
function onKey(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === "Escape") { close(); return; }
  if (event.key !== "Tab" || !panel.value) return;
  const items = [...panel.value.querySelectorAll<HTMLElement>(focusable)].filter((item) => item.getClientRects().length > 0);
  if (!items.length) { event.preventDefault(); panel.value.focus(); return; }
  const first = items[0]!, last = items[items.length - 1]!;
  const active = document.activeElement as HTMLElement | null;
  const inside = !!active && panel.value.contains(active);
  if (event.shiftKey && (!inside || active === first || active === panel.value)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (!inside || active === last)) { event.preventDefault(); first.focus(); }
}

watch(() => props.open, async (value) => {
  if (value) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    const target = panel.value?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.value;
    target?.focus({ preventScroll: true });
  } else {
    opener?.focus?.({ preventScroll: true });
    opener = null;
  }
});

onMounted(() => { mounted.value = true; window.addEventListener("keydown", onKey); });
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <Transition name="mk-drawer" :duration="{ enter: 700, leave: 520 }">
      <div v-if="open" class="mk-store fixed inset-0 z-[90]" role="dialog" aria-modal="true" :aria-label="label" :data-side="side">
        <div class="mk-drawer-backdrop absolute inset-0 bg-black/30 backdrop-blur-[6px]" @click="close" />
        <div
          ref="panel"
          tabindex="-1"
          :class="[
            'mk-drawer-panel absolute flex flex-col overflow-hidden bg-background text-foreground shadow-2xl outline-none',
            side === 'top' ? 'inset-x-0 top-0 max-h-[85dvh] rounded-b-[20px]' : 'inset-y-0 w-full sm:w-[440px]',
            side === 'right' ? 'right-0' : side === 'left' ? 'left-0' : '',
            side === 'right' && floating ? 'lg:inset-y-8 lg:right-[30px] lg:w-[480px] lg:rounded-[20px]' : '',
            side === 'left' && floating ? 'lg:inset-y-8 lg:left-[30px] lg:w-[420px] lg:rounded-[20px]' : '',
            panelClass,
          ]"
        >
          <slot :close="close">
            <div class="flex h-15 items-center justify-between border-b px-5">
              <span class="mk-display text-base">{{ label }}</span>
              <button type="button" class="grid size-10 place-items-center rounded-full transition-colors hover:bg-muted" :aria-label="closeLabel" @click="close"><XIcon class="size-5" /></button>
            </div>
          </slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mk-drawer-enter-active .mk-drawer-backdrop,
.mk-drawer-leave-active .mk-drawer-backdrop { transition: opacity 0.7s var(--ease-drawer); }
.mk-drawer-enter-active .mk-drawer-panel,
.mk-drawer-leave-active .mk-drawer-panel { transition: transform 0.5s var(--ease-drawer); }
.mk-drawer-enter-from .mk-drawer-backdrop,
.mk-drawer-leave-to .mk-drawer-backdrop { opacity: 0; }
[data-side="right"].mk-drawer-enter-from .mk-drawer-panel,
[data-side="right"].mk-drawer-leave-to .mk-drawer-panel { transform: translateX(calc(100% + 40px)); }
[data-side="left"].mk-drawer-enter-from .mk-drawer-panel,
[data-side="left"].mk-drawer-leave-to .mk-drawer-panel { transform: translateX(calc(-100% - 40px)); }
[data-side="top"].mk-drawer-enter-from .mk-drawer-panel,
[data-side="top"].mk-drawer-leave-to .mk-drawer-panel { transform: translateY(-100%); }
@media (prefers-reduced-motion: reduce) {
  .mk-drawer-enter-active .mk-drawer-panel, .mk-drawer-leave-active .mk-drawer-panel,
  .mk-drawer-enter-active .mk-drawer-backdrop, .mk-drawer-leave-active .mk-drawer-backdrop { transition-duration: 1ms; }
}
</style>
