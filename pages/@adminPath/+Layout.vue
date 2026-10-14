<template>
  <slot v-if="isLoginPage" />
  <SidebarProvider v-else class="mk-admin min-h-svh">
    <a href="#main" class="mk-skip-link">跳到主要内容</a>
    <AdminSidebar />
    <SidebarInset class="min-w-0">
      <header class="mk-admin-topbar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4 md:rounded-t-xl">
        <SidebarTrigger class="-ml-0.5 size-11 cursor-pointer md:size-8" aria-label="切换侧栏" data-testid="admin-sidebar-trigger" />
        <Separator orientation="vertical" class="h-4" />
        <nav class="flex min-w-0 flex-1 items-center gap-1.5 text-sm" aria-label="当前位置">
          <template v-for="(title, index) in routeMeta.titles" :key="`${index}-${title}`">
            <span v-if="index > 0" class="hidden text-muted-foreground/60 sm:inline" aria-hidden="true">/</span>
            <span
              :class="index === routeMeta.titles.length - 1 ? 'truncate font-medium text-foreground' : 'hidden shrink-0 text-muted-foreground sm:inline'"
              :aria-current="index === routeMeta.titles.length - 1 ? 'page' : undefined"
            >{{ title }}</span>
          </template>
        </nav>
        <div class="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" class="hidden h-8 w-52 justify-start gap-2 rounded-full px-3 font-normal text-muted-foreground lg:flex" data-testid="admin-command-trigger" @click="commandOpen = true">
            <SearchIcon class="size-4" />
            <span class="flex-1 text-left">跳转到…</span>
            <kbd class="mk-kbd">{{ modKey }}K</kbd>
          </Button>
          <Button variant="ghost" size="icon" class="size-11 lg:hidden" aria-label="快速跳转" @click="commandOpen = true"><SearchIcon /></Button>
          <Button variant="ghost" size="icon" class="size-11 md:size-8" :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'" data-testid="admin-theme-toggle" @click="toggleTheme">
            <SunIcon v-if="theme === 'dark'" /><MoonIcon v-else />
          </Button>
          <Button variant="ghost" size="icon" class="hidden size-8 md:inline-flex" as-child>
            <a href="/" target="_blank" rel="noopener" aria-label="查看店铺" title="查看店铺"><StoreIcon /></a>
          </Button>
        </div>
      </header>
      <main id="main" :key="pageKey" tabindex="-1" class="mk-admin-main outline-none @container/main flex min-w-0 flex-1 flex-col p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:p-6">
        <slot />
      </main>
    </SidebarInset>

    <Transition name="mk-fade">
      <Button
        v-if="showBackToTop"
        variant="outline"
        size="icon"
        class="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 size-11 rounded-full bg-background shadow-md"
        aria-label="返回顶部"
        @click="scrollToTop"
      >
        <ArrowUpIcon />
      </Button>
    </Transition>
    <AdminCommandMenu v-model:open="commandOpen" :base-path="basePath" />
    <AdminConfirmHost />
  </SidebarProvider>
</template>

<script lang="ts" setup>
import AdminSidebar from "@/components/AdminSidebar.vue";
import AdminCommandMenu from "@/components/admin/AdminCommandMenu.vue";
import AdminConfirmHost from "@/components/admin/AdminConfirmHost.vue";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAdminBreadcrumb } from "@/lib/admin-navigation";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import { ArrowUpIcon, MoonIcon, SearchIcon, StoreIcon, SunIcon } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { usePageContext } from "vike-vue/usePageContext";
import { SITE_TIMEZONE_KEY } from "@/lib/site-timezone";
import { onGetSiteSettings } from "@/server/site/admin.telefunc";
import { runTelefunc } from "@/lib/telefunc-client";

const pageContext = usePageContext();
const basePath = computed(() => `/${pageContext.routeParams.adminPath}`);
const isLoginPage = computed(() => pageContext.urlPathname.replace(/\/$/, "") === basePath.value);
const routeMeta = computed(() => getAdminBreadcrumb(pageContext.urlPathname, basePath.value));
// Keyed by path so each page enters with the same short fade (query-only changes keep the page mounted).
const pageKey = computed(() => pageContext.urlPathname);
const timezone = ref("Asia/Shanghai");
provide(SITE_TIMEZONE_KEY, timezone);
provide("mk-card-title-tag", "h2");
// Load once the admin shell is shown. Watching (not only onMounted) also covers signing in on the login page, which
// client-navigates into the shell while this layout stays mounted, so the timezone was never loaded before.
let timezoneLoaded = false;
function loadTimezone() {
  if (timezoneLoaded || isLoginPage.value) return;
  timezoneLoaded = true;
  void runTelefunc(() => onGetSiteSettings(), { notifyError: false }).then((settings) => { timezone.value = settings.timezone; }).catch(() => { timezoneLoaded = false; });
}
onMounted(loadTimezone);
watch(isLoginPage, loadTimezone);

const { theme, setTheme } = useStorefrontPreferences();
function toggleTheme() {
  setTheme(theme.value === "dark" ? "light" : "dark");
}

const commandOpen = ref(false);
const modKey = ref("Ctrl ");
const showBackToTop = ref(false);
function onScroll() {
  showBackToTop.value = window.scrollY > 600;
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
onMounted(() => {
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) modKey.value = "⌘";
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>
