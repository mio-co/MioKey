<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowRightIcon, ChevronRightIcon, LanguagesIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon, XIcon } from "@lucide/vue";
import { usePageContext } from "vike-vue/usePageContext";

import PublicNav from "@/components/storefront/PublicNav.vue";
import StoreDrawer from "@/components/storefront/StoreDrawer.vue";
import StorefrontBrand from "@/components/storefront/StorefrontBrand.vue";
import { useDrawerHistory } from "@/lib/ui/drawer-history";
import { useScrollDirection } from "@/lib/ui/scroll-direction";
import { useStorefrontPreferences, type StorefrontLocale } from "@/lib/storefront-preferences";
import defaultProductImage from "@/assets/product_img.jpg?url";

export type HeaderProduct = { id: number | string; name: string; slug: string; subtitle?: string | null; coverImage?: string | null; price: string; categoryName?: string | null };
export type HeaderCategory = { id: number; name: string };

const props = withDefaults(defineProps<{ products?: HeaderProduct[]; categories?: HeaderCategory[]; narrow?: boolean }>(), { products: () => [], categories: () => [], narrow: false });

type Site = { name?: string | null; notice?: string | null };
type PageContext = ReturnType<typeof usePageContext> & { site?: Site | null; user?: { id: string } | null };
const pageContext = usePageContext() as PageContext;
const { messages, setLocale, setTheme, theme, locale, t } = useStorefrontPreferences();
const { scrolled, hidden } = useScrollDirection();

const menuOpen = ref(false);
const searchOpen = ref(false);
const query = ref("");
const { navigateFromDrawer: navigateFromMenu } = useDrawerHistory(menuOpen, (value) => { menuOpen.value = value; });
const { navigateFromDrawer: navigateFromSearch } = useDrawerHistory(searchOpen, (value) => { searchOpen.value = value; });

const notice = computed(() => pageContext.site?.notice?.trim() || "");
const user = computed(() => pageContext.user ?? null);
const pathname = computed(() => pageContext.urlPathname || "/");
const navLinks = computed(() => [
  { href: "/", label: messages.value.shop.home, active: pathname.value === "/" },
  { href: "/#products", label: messages.value.shop.allProducts, active: pathname.value.startsWith("/product/") },
  user.value
    ? { href: "/account/order", label: messages.value.nav.myOrders, active: pathname.value.startsWith("/account/order") }
    : { href: "/order", label: messages.value.nav.orderLookup, active: pathname.value === "/order" },
]);

const results = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.products.slice(0, 4);
  return props.products.filter((item) => item.name.toLowerCase().includes(keyword) || item.subtitle?.toLowerCase().includes(keyword)).slice(0, 6);
});

watch(() => pageContext.urlPathname, () => { menuOpen.value = false; searchOpen.value = false; });

function submitSearch() {
  const keyword = query.value.trim();
  navigateFromSearch(keyword ? `/?q=${encodeURIComponent(keyword)}#products` : "/#products");
}
function openSearch() { menuOpen.value = false; searchOpen.value = true; }
function goHomeSection(event: MouseEvent, href: string) {
  if (!href.startsWith("/#") || pathname.value !== "/") return;
  event.preventDefault();
  document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
}
const locales: { key: StorefrontLocale; label: string }[] = [
  { key: "zh-CN", label: "简体中文" },
  { key: "zh-TW", label: "繁體中文" },
  { key: "en-US", label: "English" },
];
</script>

<template>
  <div class="mk-store contents">
    <div v-if="notice" class="relative z-[51] overflow-hidden bg-foreground text-background">
      <div class="mk-page flex h-10 items-center justify-center text-[13px] leading-5">
        <div v-if="notice.length > 38" class="w-full overflow-hidden" :aria-label="notice">
          <div class="mk-marquee" style="--mk-marquee-dur: 26s" aria-hidden="true">
            <span v-for="n in 4" :key="n" class="shrink-0 px-10">{{ notice }}</span>
          </div>
        </div>
        <p v-else class="truncate">{{ notice }}</p>
      </div>
    </div>

    <header
      class="sticky top-0 z-50 border-b border-transparent bg-background/90 backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-500 ease-out-expo supports-[backdrop-filter]:bg-background/75"
      :class="[scrolled ? 'border-border/70 shadow-[0_1px_0_0_rgb(0_0_0/0.02)]' : '', hidden && !menuOpen && !searchOpen ? '-translate-y-full' : '']"
    >
      <div :class="['mx-auto flex h-16 items-center gap-3 lg:h-[72px]', narrow ? 'max-w-5xl px-4 sm:px-6' : 'mk-page']">
        <button type="button" class="-ml-2 grid size-10 place-items-center rounded-full transition-colors hover:bg-muted md:hidden" :aria-label="messages.shop.openMenu" :aria-expanded="menuOpen" @click="menuOpen = true">
          <MenuIcon class="size-5" />
        </button>
        <div class="flex min-w-0 flex-1 items-center gap-8 max-md:justify-center">
          <StorefrontBrand />
          <nav class="hidden items-center gap-1 md:flex" :aria-label="messages.nav.main">
            <a
              v-for="link in navLinks"
              :key="link.href"
              :href="link.href"
              :aria-current="link.active ? 'page' : undefined"
              class="rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-300 hover:bg-foreground hover:text-background aria-[current=page]:bg-foreground aria-[current=page]:text-background"
              @click="goHomeSection($event, link.href)"
            >{{ link.label }}</a>
          </nav>
        </div>
        <div class="flex shrink-0 items-center">
          <button type="button" class="grid size-10 place-items-center rounded-full transition-colors hover:bg-muted" :aria-label="messages.shop.search" data-testid="header-search" @click="openSearch">
            <SearchIcon class="size-[19px]" />
          </button>
          <PublicNav />
        </div>
      </div>
    </header>

    <!-- Search: a sheet that drops from the top (Rawjoy header search). -->
    <StoreDrawer v-model:open="searchOpen" side="top" :label="messages.shop.searchTitle" :close-label="messages.shop.close">
      <template #default="{ close }">
        <div class="mk-page w-full py-5 sm:py-8">
          <form class="flex items-center gap-3" role="search" @submit.prevent="submitSearch">
            <div class="relative flex-1">
              <SearchIcon class="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                v-model="query"
                data-autofocus
                type="search"
                enterkeyhint="search"
                :placeholder="messages.shop.searchPlaceholder"
                :aria-label="messages.shop.searchPlaceholder"
                class="h-14 w-full rounded-full border border-transparent bg-muted pl-13 pr-12 text-base outline-none transition-[border-color,background-color] duration-300 placeholder:text-muted-foreground focus:border-foreground focus:bg-background"
              />
              <button v-if="query" type="button" class="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-background" :aria-label="messages.shop.clearSearch" @click="query = ''"><XIcon class="size-4" /></button>
            </div>
            <button type="button" class="grid size-12 shrink-0 place-items-center rounded-full border transition-colors hover:bg-foreground hover:text-background" :aria-label="messages.shop.close" @click="close"><XIcon class="size-5" /></button>
          </form>
          <div class="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
            <div v-if="categories.length" class="min-w-0">
              <p class="mk-eyebrow text-muted-foreground">{{ messages.shop.popular }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <a v-for="category in categories" :key="category.id" :href="`/?category=${category.id}#products`" class="rounded-full border px-4 py-1.5 text-sm transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background" @click="navigateFromSearch(`/?category=${category.id}#products`, $event)">{{ category.name }}</a>
              </div>
            </div>
            <div class="min-w-0">
              <p class="mk-eyebrow text-muted-foreground">{{ query.trim() ? messages.shop.searchResults : messages.shop.featured }}</p>
              <p v-if="query.trim() && !results.length && products.length" class="mt-3 text-sm text-muted-foreground">{{ messages.shop.searchEmpty }}</p>
              <p v-else-if="!products.length" class="mt-3 text-sm text-muted-foreground">{{ messages.shop.searchHint }}</p>
              <ul class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <li v-for="item in results" :key="item.id">
                  <a :href="`/product/${item.slug}`" class="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted" @click="navigateFromSearch(`/product/${item.slug}`, $event)">
                    <span class="size-16 shrink-0 overflow-hidden rounded-xl bg-muted"><img :src="item.coverImage || defaultProductImage" :alt="item.name" loading="lazy" class="size-full object-cover transition-transform duration-[1300ms] ease-out-expo group-hover:scale-110" /></span>
                    <span class="min-w-0 flex-1">
                      <span v-if="item.categoryName" class="block truncate text-xs text-muted-foreground">{{ item.categoryName }}</span>
                      <span class="mk-display block truncate text-[15px]">{{ item.name }}</span>
                      <span class="block text-sm font-semibold tabular-nums">¥{{ item.price }}</span>
                    </span>
                    <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
                  </a>
                </li>
              </ul>
              <button v-if="query.trim()" type="button" class="mk-link mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" @click="submitSearch">{{ messages.shop.viewAll }} <ArrowRightIcon class="size-4" /></button>
            </div>
          </div>
        </div>
      </template>
    </StoreDrawer>

    <!-- Mobile menu: left drawer with large links, preferences and the sign-in pill at the bottom. -->
    <StoreDrawer v-model:open="menuOpen" side="left" :floating="false" :label="messages.shop.menu" :close-label="messages.shop.closeMenu">
      <template #default="{ close }">
        <div class="flex h-15 shrink-0 items-center justify-between border-b pl-5">
          <StorefrontBrand />
          <button type="button" class="grid h-full w-15 place-items-center border-l" data-autofocus :aria-label="messages.shop.closeMenu" @click="close"><XIcon class="size-5" /></button>
        </div>
        <nav class="flex-1 overflow-y-auto px-5 py-4" :aria-label="messages.nav.main">
          <a
            v-for="(link, index) in navLinks"
            :key="link.href"
            :href="link.href"
            :aria-current="link.active ? 'page' : undefined"
            class="mk-menu-item mk-display flex items-center justify-between border-b py-4 text-[19px]"
            :style="{ '--i': index }"
            @click="navigateFromMenu(link.href, $event)"
          >{{ link.label }}<ChevronRightIcon class="size-5 text-muted-foreground" /></a>
          <a v-if="user" href="/account" class="mk-menu-item mk-display flex items-center justify-between border-b py-4 text-[19px]" :style="{ '--i': navLinks.length }" @click="navigateFromMenu('/account', $event)">{{ messages.nav.accountSettings }}<ChevronRightIcon class="size-5 text-muted-foreground" /></a>
          <button type="button" class="mk-menu-item mk-display flex w-full items-center justify-between border-b py-4 text-left text-[19px]" :style="{ '--i': navLinks.length + 1 }" @click="openSearch">{{ messages.shop.search }}<SearchIcon class="size-5 text-muted-foreground" /></button>

          <div class="mt-6 grid gap-4">
            <div>
              <p class="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><LanguagesIcon class="size-4" />{{ messages.preferences.language }}</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="item in locales" :key="item.key" type="button" :aria-pressed="locale === item.key" class="h-10 rounded-full border px-4 text-sm transition-colors aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background" @click="setLocale(item.key)">{{ item.label }}</button>
              </div>
            </div>
            <div>
              <p class="mb-2 text-sm text-muted-foreground">{{ messages.preferences.theme }}</p>
              <div class="inline-flex rounded-full border p-1">
                <button type="button" :aria-pressed="theme === 'light'" class="flex h-9 items-center gap-1.5 rounded-full px-4 text-sm transition-colors aria-pressed:bg-foreground aria-pressed:text-background" @click="setTheme('light')"><SunIcon class="size-4" />{{ messages.preferences.light }}</button>
                <button type="button" :aria-pressed="theme === 'dark'" class="flex h-9 items-center gap-1.5 rounded-full px-4 text-sm transition-colors aria-pressed:bg-foreground aria-pressed:text-background" @click="setTheme('dark')"><MoonIcon class="size-4" />{{ messages.preferences.dark }}</button>
              </div>
            </div>
          </div>
        </nav>
        <div class="border-t p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <a v-if="!user" href="/login" class="flex h-12 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90" @click="navigateFromMenu('/login', $event)">{{ messages.nav.signIn }}</a>
          <p v-else class="text-center text-xs text-muted-foreground">{{ t(messages.shop.poweredBy) }}</p>
        </div>
      </template>
    </StoreDrawer>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .mk-menu-item { animation: mk-fade-up 0.6s var(--ease-out-expo) both; animation-delay: calc(120ms + var(--i, 0) * 45ms); }
}
</style>
