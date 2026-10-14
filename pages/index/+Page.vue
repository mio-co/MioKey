<template>
  <StoreShell :products="data.products" :categories="data.categories">
    <!-- Hero -->
    <section class="mk-page grid items-center gap-8 pb-10 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:pb-16 lg:pt-14">
      <div class="max-w-xl">
        <p class="mk-eyebrow animate-fade-up text-muted-foreground">{{ messages.shop.heroEyebrow }}</p>
        <h1 class="mt-4 animate-fade-up whitespace-pre-line text-[clamp(34px,5.2vw,64px)] font-semibold leading-[1.08] tracking-[-0.02em] [animation-delay:80ms]">{{ site.subtitle || messages.shop.heroTitle }}</h1>
        <p class="mt-5 max-w-md animate-fade-up text-base leading-7 text-muted-foreground [animation-delay:160ms]">{{ messages.shop.heroText }}</p>
        <div class="mt-8 flex animate-fade-up flex-wrap gap-3 [animation-delay:240ms]">
          <a href="#products" class="mk-sweep inline-flex h-12 items-center gap-2 rounded-full bg-foreground pl-6 pr-2 text-[15px] font-semibold text-background" @click.prevent="scrollToProducts">
            {{ messages.shop.heroCta }}
            <span class="grid size-8 place-items-center rounded-full bg-background text-foreground"><ArrowDownIcon class="size-4" /></span>
          </a>
          <a :href="user ? '/account/order' : '/order'" class="inline-flex h-12 items-center rounded-full border border-foreground/15 px-6 text-[15px] font-semibold transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background">{{ messages.shop.heroSecondary }}</a>
        </div>
      </div>
      <div v-if="featured.length" class="min-w-0 animate-fade-up [animation-delay:200ms]">
        <ProductCarousel :products="featured" />
      </div>
    </section>

    <!-- Service strip -->
    <section class="border-y bg-muted/40">
      <ul class="mk-page grid grid-cols-2 gap-x-4 gap-y-6 py-7 lg:grid-cols-4 lg:py-9">
        <li v-for="item in services" :key="item.title" class="flex items-start gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-full bg-background ring-1 ring-border"><component :is="item.icon" class="size-5" /></span>
          <span class="min-w-0">
            <span class="mk-display block text-[15px]">{{ item.title }}</span>
            <span class="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{{ item.text }}</span>
          </span>
        </li>
      </ul>
    </section>

    <!-- Catalogue -->
    <section id="products" class="mk-page mk-sec scroll-mt-20">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <h2 class="mk-h2">{{ query ? t(messages.storefront.relatedProducts, { count: visibleProducts.length }) : messages.shop.allProducts }}</h2>
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div class="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <SearchIcon class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="query" type="search" class="pl-10!" :placeholder="messages.storefront.searchProducts" :aria-label="messages.storefront.searchProducts" />
          </div>
          <Select v-model="sort">
            <SelectTrigger class="w-auto min-w-36" :aria-label="messages.shop.sortLabel"><SelectValue /></SelectTrigger>
            <SelectContent class="rounded-2xl">
              <SelectItem value="default">{{ messages.shop.sortDefault }}</SelectItem>
              <SelectItem value="price-asc">{{ messages.shop.sortPriceAsc }}</SelectItem>
              <SelectItem value="price-desc">{{ messages.shop.sortPriceDesc }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="data.categories.length" class="sticky top-16 z-30 -mx-[var(--mk-pad)] mt-6 bg-background/85 px-[var(--mk-pad)] py-3 backdrop-blur-xl lg:top-[72px]">
        <div class="mk-no-scrollbar flex gap-2 overflow-x-auto" role="tablist" :aria-label="messages.storefront.categories">
          <button
            v-for="item in categoryTabs"
            :key="String(item.id)"
            type="button"
            role="tab"
            :aria-selected="selectedCategory === item.id"
            class="h-11 shrink-0 rounded-full md:h-10 border px-5 text-sm font-medium transition-colors duration-300 hover:border-foreground aria-selected:border-foreground aria-selected:bg-foreground aria-selected:text-background"
            @click="selectCategory(item.id)"
          >
            {{ item.name }}<span class="ml-1.5 text-xs opacity-60 tabular-nums">{{ item.count }}</span>
          </button>
        </div>
      </div>

      <TransitionGroup v-if="visibleProducts.length" tag="div" name="mk-grid" class="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-7 lg:gap-y-10 xl:grid-cols-4">
        <ProductCard v-for="(product, index) in visibleProducts" :key="product.id" :product="product" :eager="index < 4 && !featured.length" />
      </TransitionGroup>

      <div v-else class="mt-8 grid place-items-center rounded-[24px] border border-dashed px-6 py-20 text-center">
        <span class="grid size-14 place-items-center rounded-full bg-muted"><PackageOpenIcon class="size-6 text-muted-foreground" /></span>
        <h3 class="mk-display mt-4 text-lg">{{ query ? messages.shop.searchEmpty : messages.storefront.noProducts }}</h3>
        <p v-if="!query" class="mt-2 text-sm text-muted-foreground">{{ messages.storefront.noProductsDescription }}</p>
        <Button v-else variant="outline" class="mt-5" @click="query = ''; selectedCategory = null">{{ messages.shop.clearSearch }}</Button>
      </div>
    </section>
  </StoreShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { ArrowDownIcon, HeadphonesIcon, PackageOpenIcon, ReceiptTextIcon, SearchIcon, ShieldCheckIcon, ZapIcon } from "@lucide/vue";
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import ProductCard from "@/components/storefront/ProductCard.vue";
import ProductCarousel from "@/components/storefront/ProductCarousel.vue";
import StoreShell from "@/components/storefront/StoreShell.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Data } from "./+data.server";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

type Site = { name: string; subtitle: string | null; logo: string | null; notice: string | null; footerText: string | null };

const data = useData<Data>();
const pageContext = usePageContext() as unknown as { site: Site; user?: { id: string } | null; urlParsed: { search: Record<string, string | undefined> } };
const site = pageContext.site;
const user = pageContext.user ?? null;
const { messages, t } = useStorefrontPreferences();
const initialCategory = Number(pageContext.urlParsed.search.category);
const selectedCategory = ref<number | null>(Number.isInteger(initialCategory) && data.categories.some((item) => item.id === initialCategory) ? initialCategory : null);
const query = ref(pageContext.urlParsed.search.q?.trim() ?? "");
const sort = ref<"default" | "price-asc" | "price-desc">("default");

const featured = computed(() => {
  const inStock = data.products.filter((product) => product.availableStock !== 0);
  return (inStock.length ? inStock : data.products).slice(0, 5);
});
const categoryTabs = computed(() => [
  { id: null as number | null, name: messages.value.storefront.all, count: data.products.length },
  ...data.categories.map((item) => ({ id: item.id as number | null, name: item.name, count: data.products.filter((product) => product.categoryId === item.id).length })),
]);
const services = computed(() => [
  { icon: ZapIcon, title: messages.value.shop.services.autoTitle, text: messages.value.shop.services.autoText },
  { icon: ShieldCheckIcon, title: messages.value.shop.services.secureTitle, text: messages.value.shop.services.secureText },
  { icon: ReceiptTextIcon, title: messages.value.shop.services.lookupTitle, text: messages.value.shop.services.lookupText },
  { icon: HeadphonesIcon, title: messages.value.shop.services.supportTitle, text: messages.value.shop.services.supportText },
]);
const visibleProducts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  const list = data.products.filter((product) =>
    (selectedCategory.value === null || product.categoryId === selectedCategory.value)
    && (!keyword || product.name.toLowerCase().includes(keyword) || product.subtitle?.toLowerCase().includes(keyword)),
  );
  if (sort.value === "default") return list;
  const direction = sort.value === "price-asc" ? 1 : -1;
  return [...list].sort((a, b) => (Number(a.minPrice ?? a.price) - Number(b.minPrice ?? b.price)) * direction);
});

function selectCategory(id: number | null) {
  selectedCategory.value = id;
}
function scrollToProducts() {
  document.getElementById("products")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

// Keep ?q= / ?category= in the URL (shareable, survives reload) without adding history entries.
watch([query, selectedCategory], ([q, category]) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (q.trim()) url.searchParams.set("q", q.trim()); else url.searchParams.delete("q");
  if (category !== null) url.searchParams.set("category", String(category)); else url.searchParams.delete("category");
  window.history.replaceState(window.history.state, "", url);
});
onMounted(() => {
  if (window.location.hash === "#products" || query.value || selectedCategory.value !== null) {
    requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ block: "start" }));
  }
});
</script>

<style scoped>
.mk-grid-move { transition: transform 0.6s var(--ease-out-expo); }
.mk-grid-enter-active { transition: opacity 0.45s var(--ease-out-expo), transform 0.45s var(--ease-out-expo); }
.mk-grid-enter-from { opacity: 0; transform: translateY(12px) scale(0.98); }
.mk-grid-leave-active { display: none; }
</style>
