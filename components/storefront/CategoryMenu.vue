<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { ChevronDownIcon } from "@lucide/vue";
import { navigate } from "vike/client/router";
import { usePageContext } from "vike-vue/usePageContext";
import { categoryHref, useHomeCategoryFilter, useNavCategories, type NavCategory } from "@/lib/storefront-categories";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/**
 * Desktop header "All products" disclosure menu (WAI-ARIA disclosure navigation pattern):
 * opens on mouse hover (small open/close delay so passing over it does not flicker), on keyboard
 * (Enter / Space / ArrowDown) and on click/tap (touch laptops never get a hover). Esc closes and returns
 * focus to the trigger; leaving with Tab or clicking outside closes it. On the home page a category
 * filters the loaded catalogue in place; elsewhere it client-navigates to `/?category=<id>`.
 * The panel is always rendered (v-show), so the SSR HTML already carries every category link.
 */
const props = withDefaults(defineProps<{ categories?: NavCategory[]; total?: number | null; active?: boolean }>(), { categories: () => [], total: null, active: false });

const { messages, t } = useStorefrontPreferences();
const pageContext = usePageContext();
const homeFilter = useHomeCategoryFilter();
const { categories, totalCount, loading, ensure } = useNavCategories(() => props.categories, () => props.total);

const panelId = `mk-category-menu-${useId()}`;
const open = ref(false);
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
let openedBy: "hover" | "click" | "keyboard" | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
// Safari does not focus links on click, so a press inside the menu would otherwise look like focus leaving it.
let pressInside = false;
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const currentId = computed<number | null>(() => {
  if (homeFilter) return homeFilter.selected.value;
  if ((pageContext.urlPathname || "/") !== "/") return null;
  const id = Number(pageContext.urlParsed?.search?.category);
  return Number.isInteger(id) ? id : null;
});
const onHome = computed(() => (pageContext.urlPathname || "/") === "/");
const items = computed(() => [
  { id: null as number | null, name: messages.value.storefront.all, count: totalCount.value ?? undefined },
  ...categories.value.map((item) => ({ id: item.id as number | null, name: item.name, count: item.count })),
]);

function clearTimer() { if (timer) { clearTimeout(timer); timer = undefined; } }
function setOpen(value: boolean, reason: typeof openedBy = null) {
  clearTimer();
  if (value) { openedBy = reason; void ensure(); }
  else openedBy = null;
  open.value = value;
}

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType !== "mouse") return; // touch / pen: the click toggles instead
  void ensure();
  clearTimer();
  if (!open.value) timer = setTimeout(() => setOpen(true, "hover"), 90);
}
function onPointerLeave(event: PointerEvent) {
  if (event.pointerType !== "mouse") return;
  clearTimer();
  // Hover-opened menus close when the pointer leaves; a click/keyboard-opened one stays until dismissed.
  if (open.value && openedBy === "hover") timer = setTimeout(() => setOpen(false), 180);
}
function onTriggerClick() {
  // A hover-opened menu is "pinned" by a click instead of closing under the pointer.
  if (open.value && openedBy === "hover") { openedBy = "click"; return; }
  setOpen(!open.value, "click");
}

function focusItem(index: number) {
  const links = panel.value ? [...panel.value.querySelectorAll<HTMLAnchorElement>("a[href]")] : [];
  if (!links.length) return;
  links[(index + links.length) % links.length]?.focus();
}
async function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  if (!open.value) setOpen(true, "keyboard");
  await nextTick();
  focusItem(event.key === "ArrowDown" ? 0 : -1);
}
function onPanelKeydown(event: KeyboardEvent) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
  const links = panel.value ? [...panel.value.querySelectorAll<HTMLAnchorElement>("a[href]")] : [];
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  event.preventDefault();
  if (event.key === "Home") focusItem(0);
  else if (event.key === "End") focusItem(-1);
  else focusItem(index + (event.key === "ArrowDown" ? 1 : -1));
}
function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;
  event.stopPropagation();
  setOpen(false);
  trigger.value?.focus();
}
function onRootPointerDown() {
  pressInside = true;
  document.addEventListener("pointerup", () => setTimeout(() => { pressInside = false; }), { once: true, capture: true });
}
function onFocusOut(event: FocusEvent) {
  if (pressInside) return;
  const next = event.relatedTarget as Node | null;
  if (open.value && (!next || !root.value?.contains(next))) setOpen(false);
}
function onDocumentPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) setOpen(false);
}

function choose(id: number | null, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; // new tab etc.
  event.preventDefault();
  setOpen(false);
  trigger.value?.focus({ preventScroll: true });
  if (homeFilter && onHome.value) {
    homeFilter.select(id);
    return;
  }
  void navigate(categoryHref(id));
}

watch(open, (value) => {
  emit("update:open", value);
  if (typeof document === "undefined") return;
  if (value) document.addEventListener("pointerdown", onDocumentPointerDown, true);
  else document.removeEventListener("pointerdown", onDocumentPointerDown, true);
});
watch(() => pageContext.urlPathname, () => setOpen(false));
onBeforeUnmount(() => { clearTimer(); document.removeEventListener("pointerdown", onDocumentPointerDown, true); });

const countLabel = (count: number | undefined) => (count === undefined ? "" : t(messages.value.shop.resultCount, { count }));
</script>

<template>
  <div ref="root" class="relative" data-testid="header-category-menu" @pointerenter="onPointerEnter" @pointerleave="onPointerLeave" @keydown="onKeydown" @focusout="onFocusOut" @pointerdown="onRootPointerDown">
    <button
      ref="trigger"
      type="button"
      :aria-expanded="open"
      :aria-controls="panelId"
      :data-active="active || undefined"
      class="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 outline-none hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-expanded:bg-foreground aria-expanded:text-background data-[active]:bg-foreground data-[active]:text-background"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      {{ messages.shop.allProducts }}
      <ChevronDownIcon class="size-3.5 transition-transform duration-300 motion-reduce:transition-none" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
    </button>
    <Transition name="mk-pop">
      <div
        v-show="open"
        :id="panelId"
        ref="panel"
        class="absolute left-0 top-full z-[60] pt-2"
        @keydown="onPanelKeydown"
      >
        <nav class="w-64 overflow-hidden rounded-2xl border bg-background p-1.5 text-foreground shadow-lg" :aria-label="messages.storefront.categories">
          <ul class="max-h-[min(60vh,420px)] overflow-y-auto">
            <li v-for="item in items" :key="String(item.id)">
              <a
                :href="categoryHref(item.id)"
                :aria-current="onHome && currentId === item.id ? 'page' : undefined"
                class="flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-foreground aria-[current=page]:font-semibold"
                @click="choose(item.id, $event)"
              >
                <span class="min-w-0 truncate">{{ item.name }}</span>
                <template v-if="item.count !== undefined">
                  <span class="shrink-0 text-xs tabular-nums text-muted-foreground" aria-hidden="true">{{ item.count }}</span>
                  <span class="sr-only">{{ countLabel(item.count) }}</span>
                </template>
              </a>
            </li>
          </ul>
          <p v-if="loading && !categories.length" class="px-3 py-2 text-xs text-muted-foreground" role="status">{{ messages.common.loading }}</p>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mk-pop-enter-active, .mk-pop-leave-active { transition: opacity 0.16s ease, transform 0.22s var(--ease-out-expo); }
.mk-pop-enter-from, .mk-pop-leave-to { opacity: 0; transform: translateY(-4px); }
@media (prefers-reduced-motion: reduce) { .mk-pop-enter-active, .mk-pop-leave-active { transition-duration: 1ms; } }
</style>
