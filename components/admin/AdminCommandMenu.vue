<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from "vue";
import { navigate } from "vike/client/router";
import { useEventListener } from "@vueuse/core";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminNavigation, adminPages, type AdminPageMeta } from "@/lib/admin-navigation";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import { CornerDownLeftIcon, FileTextIcon, MoonIcon, SearchIcon, StoreIcon, SunIcon } from "@lucide/vue";

/**
 * ⌘K / Ctrl+K command menu: jump to any admin page, toggle theme, open the store.
 * Keyboard: ↑/↓ to move, Enter to run, Esc to close. Pinyin initials match too ("ddgl" → 订单管理).
 */
const props = defineProps<{ basePath: string }>();
const open = defineModel<boolean>("open", { default: false });

type Command = { id: string; title: string; hint: string; group: string; icon: Component; run: () => void; keywords: string };

const { theme, setTheme } = useStorefrontPreferences();
const query = ref("");
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const pinyinKeys = ref<Record<string, string>>({});

const groupOf = (page: AdminPageMeta) => {
  const groups = [adminNavigation.product, adminNavigation.suppliers, adminNavigation.push, adminNavigation.system];
  for (const group of groups) if (group.items.some((item) => item.path === page.path || ("items" in item && item.items.some((child) => child.path === page.path)))) return group.title;
  return "页面";
};

const pageCommands = computed<Command[]>(() => Object.values(adminPages as Record<string, AdminPageMeta>)
  .filter((page) => !page.path.includes(":"))
  .map((page) => ({
    id: page.path,
    title: page.title,
    hint: page.description,
    group: groupOf(page),
    icon: FileTextIcon,
    keywords: `${page.title} ${page.pageTitle} ${page.path} ${pinyinKeys.value[page.title] ?? ""}`.toLowerCase(),
    run: () => { void navigate(props.basePath + page.path); },
  })));

const actionCommands = computed<Command[]>(() => [
  { id: "theme", title: theme.value === "dark" ? "切换到浅色模式" : "切换到深色模式", hint: "外观", group: "操作", icon: theme.value === "dark" ? SunIcon : MoonIcon, keywords: "theme dark light 主题 深色 浅色 zt", run: () => setTheme(theme.value === "dark" ? "light" : "dark") },
  { id: "store", title: "在新标签页打开店铺", hint: "前台", group: "操作", icon: StoreIcon, keywords: "store shop 店铺 前台 dp", run: () => { window.open("/", "_blank", "noopener"); } },
]);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  const all = [...pageCommands.value, ...actionCommands.value];
  if (!q) return all;
  return all.filter((command) => command.keywords.includes(q) || command.title.toLowerCase().includes(q));
});

const grouped = computed(() => {
  const map = new Map<string, { command: Command; index: number }[]>();
  results.value.forEach((command, index) => {
    if (!map.has(command.group)) map.set(command.group, []);
    map.get(command.group)!.push({ command, index });
  });
  return [...map.entries()];
});

watch(query, () => { activeIndex.value = 0; });
watch(open, async (value) => {
  if (!value) return;
  query.value = "";
  activeIndex.value = 0;
  await nextTick();
  inputRef.value?.focus();
  if (!Object.keys(pinyinKeys.value).length) {
    try {
      const { pinyin } = await import("pinyin-pro");
      const keys: Record<string, string> = {};
      for (const page of Object.values(adminPages as Record<string, AdminPageMeta>)) {
        keys[page.title] = `${pinyin(page.title, { pattern: "first", toneType: "none", separator: "" })} ${pinyin(page.title, { toneType: "none", separator: "" })}`;
      }
      pinyinKeys.value = keys;
    } catch { /* pinyin matching is a nicety */ }
  }
});

function run(command: Command | undefined) {
  if (!command) return;
  open.value = false;
  command.run();
}

function onKeydown(event: KeyboardEvent) {
  const count = results.value.length;
  if (event.key === "ArrowDown") { event.preventDefault(); activeIndex.value = count ? (activeIndex.value + 1) % count : 0; scrollActive(); }
  else if (event.key === "ArrowUp") { event.preventDefault(); activeIndex.value = count ? (activeIndex.value - 1 + count) % count : 0; scrollActive(); }
  else if (event.key === "Enter") { event.preventDefault(); run(results.value[activeIndex.value]); }
}

function scrollActive() {
  void nextTick(() => listRef.value?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ block: "nearest" }));
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

if (typeof window !== "undefined") {
  useEventListener(window, "keydown", (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open.value = !open.value;
      return;
    }
    if (open.value || isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    // "/" focuses the search box of the current page (first text input inside the main area).
    if (event.key === "/") {
      const field = document.querySelector<HTMLInputElement>("main [data-slot=input]:not([type=hidden]):not([disabled]), main input[type=search]");
      if (field) { event.preventDefault(); field.focus(); field.select?.(); }
    }
  });
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="mk-command top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" :show-close-button="false" data-testid="admin-command">
      <DialogTitle class="sr-only">快速跳转</DialogTitle>
      <DialogDescription class="sr-only">输入页面名称或拼音首字母，回车跳转。</DialogDescription>
      <div class="flex items-center gap-3 border-b px-4">
        <SearchIcon class="size-4 shrink-0 text-muted-foreground" />
        <input
          ref="inputRef"
          v-model="query"
          class="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          placeholder="搜索页面或操作…（支持拼音首字母）"
          role="combobox"
          aria-expanded="true"
          aria-controls="mk-command-list"
          :aria-activedescendant="results[activeIndex] ? `mk-cmd-${activeIndex}` : undefined"
          @keydown="onKeydown"
        />
        <kbd class="hidden rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
      </div>
      <div id="mk-command-list" ref="listRef" role="listbox" class="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-2">
        <p v-if="!results.length" class="px-3 py-10 text-center text-sm text-muted-foreground">没有匹配“{{ query }}”的页面</p>
        <div v-for="[group, items] in grouped" :key="group" class="mb-1" role="group" :aria-label="group">
          <p class="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">{{ group }}</p>
          <button
            v-for="{ command, index } in items"
            :id="`mk-cmd-${index}`"
            :key="command.id"
            type="button"
            role="option"
            :aria-selected="index === activeIndex"
            :data-active="index === activeIndex"
            class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors data-[active=true]:bg-accent"
            @mousemove="activeIndex = index"
            @click="run(command)"
          >
            <component :is="command.icon" class="size-4 shrink-0 text-muted-foreground" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ command.title }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ command.hint }}</span>
            </span>
            <CornerDownLeftIcon v-if="index === activeIndex" class="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div class="hidden items-center gap-4 border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
        <span><kbd class="mk-kbd">↑</kbd><kbd class="mk-kbd">↓</kbd> 选择</span>
        <span><kbd class="mk-kbd">Enter</kbd> 打开</span>
        <span><kbd class="mk-kbd">⌘/Ctrl B</kbd> 折叠侧栏</span>
        <span><kbd class="mk-kbd">/</kbd> 搜索本页</span>
      </div>
    </DialogContent>
  </Dialog>
</template>
