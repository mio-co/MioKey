<template>
  <StoreShell :products="data.products" :categories="navCategories" :product-total="data.products.length">
    <!-- Catalogue -->
    <section id="products" class="mk-page scroll-mt-20 pb-12 pt-1 sm:pb-16 sm:pt-2">
      <h1 class="sr-only">{{ query ? t(messages.storefront.relatedProducts, { count: visibleProducts.length }) : messages.shop.allProducts }}</h1>

      <!-- Active category (chosen in the header menu / menu drawer, or ?category= in the URL) with a way back to everything. -->
      <div v-if="activeCategory" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite" data-testid="active-category">
        <span>{{ messages.storefront.categories }} · <span class="font-medium text-foreground">{{ activeCategory.name }}</span> · {{ t(messages.shop.resultCount, { count: visibleProducts.length }) }}</span>
        <a href="/" class="inline-flex h-11 items-center font-medium text-foreground underline-offset-4 hover:underline md:h-8" @click="clearCategory">{{ messages.shop.allProducts }}</a>
      </div>

      <!-- Header search lands here as ?q=; show what was searched and a way out. -->
      <div v-if="query" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite">
        <span>{{ t(messages.storefront.relatedProducts, { count: visibleProducts.length }) }} · “{{ query }}”</span>
        <button type="button" class="inline-flex h-11 items-center font-medium text-foreground underline-offset-4 hover:underline md:h-8" @click="query = ''">{{ messages.shop.clearSearch }}</button>
      </div>

      <!-- Swapping the filter replaces the grid in one go and fades the new one in; per-card move/enter animations made the page jolt. -->
      <Transition name="mk-swap">
        <div v-if="visibleProducts.length" :key="gridKey" class="mt-4 grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-5 md:grid-cols-3 lg:gap-x-7 lg:gap-y-10 xl:grid-cols-4">
          <ProductCard v-for="(product, index) in visibleProducts" :key="product.id" :product="product" :eager="index < 4" />
        </div>
      </Transition>

      <div v-if="!visibleProducts.length" class="mt-4 grid place-items-center rounded-[24px] border border-dashed px-6 py-20 text-center">
        <span class="grid size-14 place-items-center rounded-full bg-muted"><PackageOpenIcon class="size-6 text-muted-foreground" /></span>
        <h3 class="mk-display mt-4 text-lg">{{ query ? messages.shop.searchEmpty : messages.storefront.noProducts }}</h3>
        <p v-if="!query" class="mt-2 text-sm text-muted-foreground">{{ messages.storefront.noProductsDescription }}</p>
        <Button v-else variant="outline" class="mt-5" @click="query = ''; selectedCategory = null">{{ messages.shop.clearSearch }}</Button>
      </div>
    </section>
    <!-- Service strip -->
    <section class="border-t">
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
  </StoreShell>
</template>

<script lang="ts" setup>
import { computed, onMounted, provide, ref, watch } from "vue";
import { HeadphonesIcon, PackageOpenIcon, ReceiptTextIcon, ShieldCheckIcon, ZapIcon } from "@lucide/vue";
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import ProductCard from "@/components/storefront/ProductCard.vue";
import StoreShell from "@/components/storefront/StoreShell.vue";
import { Button } from "@/components/ui/button";
import type { Data } from "./+data.server";
import { HOME_CATEGORY_FILTER_KEY } from "@/lib/storefront-categories";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

const data = useData<Data>();
const pageContext = usePageContext() as unknown as { urlParsed: { search: Record<string, string | undefined> } };
const { messages, t } = useStorefrontPreferences();
const parseCategory = (value: string | undefined) => {
  const id = Number(value);
  return Number.isInteger(id) && data.categories.some((item) => item.id === id) ? id : null;
};
const selectedCategory = ref<number | null>(parseCategory(pageContext.urlParsed.search.category));
const query = ref(pageContext.urlParsed.search.q?.trim() ?? "");

// Header dropdown and menu drawer: category list with product counts (the toolbar row was removed).
const navCategories = computed(() => data.categories.map((item) => ({ id: item.id, name: item.name, count: data.products.filter((product) => product.categoryId === item.id).length })));
const activeCategory = computed(() => (selectedCategory.value === null ? null : data.categories.find((item) => item.id === selectedCategory.value) ?? null));
const services = computed(() => [
  { icon: ZapIcon, title: messages.value.shop.services.autoTitle, text: messages.value.shop.services.autoText },
  { icon: ShieldCheckIcon, title: messages.value.shop.services.secureTitle, text: messages.value.shop.services.secureText },
  { icon: ReceiptTextIcon, title: messages.value.shop.services.lookupTitle, text: messages.value.shop.services.lookupText },
  { icon: HeadphonesIcon, title: messages.value.shop.services.supportTitle, text: messages.value.shop.services.supportText },
]);
const visibleProducts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return data.products.filter((product) =>
    (selectedCategory.value === null || product.categoryId === selectedCategory.value)
    && (!keyword || product.name.toLowerCase().includes(keyword) || product.subtitle?.toLowerCase().includes(keyword)),
  );
});

function scrollToProducts() {
  // Only scroll back when the visitor is already below the top of the list; at the top a scroll just nudges the header.
  const section = document.getElementById("products");
  if (!section || section.getBoundingClientRect().top >= 0) return;
  section.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
const gridKey = computed(() => `${selectedCategory.value ?? "all"}|${query.value}`);
function selectCategory(id: number | null) {
  selectedCategory.value = id === null || data.categories.some((item) => item.id === id) ? id : null;
  if (typeof window !== "undefined") scrollToProducts();
}
function clearCategory(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  selectCategory(null);
}
// Lets the header dropdown filter in place instead of a pageContext round trip (see lib/storefront-categories.ts).
provide(HOME_CATEGORY_FILTER_KEY, { selected: selectedCategory, select: selectCategory });

// Keep ?q= / ?category= in the URL (shareable, survives reload) without adding history entries.
watch([query, selectedCategory], ([q, category]) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (q.trim()) url.searchParams.set("q", q.trim()); else url.searchParams.delete("q");
  if (category !== null) url.searchParams.set("category", String(category)); else url.searchParams.delete("category");
  window.history.replaceState(window.history.state, "", url);
});
// Category links in the menu drawer / search sheet navigate to /?category=… (or ?q=…) while this page stays mounted.
// Watch the parsed URL itself (a new object per navigation), not its values: after an in-place filter change the
// URL was only replaceState'd, so navigating back to the same ?category= the page loaded with must still apply.
watch(() => pageContext.urlParsed, (url) => {
  selectedCategory.value = parseCategory(url.search.category);
  query.value = url.search.q?.trim() ?? "";
});
onMounted(() => {
  if (window.location.hash === "#products" || query.value || selectedCategory.value !== null) {
    requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ block: "start" }));
  }
});
</script>

<style scoped>
.mk-swap-enter-active { transition: opacity 0.22s ease-out; }
.mk-swap-enter-from { opacity: 0; }
.mk-swap-leave-active { display: none; }
@media (prefers-reduced-motion: reduce) { .mk-swap-enter-active { transition: none; } }
</style>
