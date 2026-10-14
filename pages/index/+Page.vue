<template>
  <StoreShell :products="data.products" :categories="data.categories">
    <!-- Catalogue -->
    <section id="products" class="mk-page scroll-mt-20 pb-12 pt-1 sm:pb-16 sm:pt-2">
      <h1 class="sr-only">{{ query ? t(messages.storefront.relatedProducts, { count: visibleProducts.length }) : messages.shop.allProducts }}</h1>

      <!-- Toolbar: category tabs scroll on the left, sort pinned to the right; sticks under the header. -->
      <div class="sticky top-16 z-30 -mx-[var(--mk-pad)] flex items-center gap-3 border-b border-transparent bg-background/85 px-[var(--mk-pad)] py-3 backdrop-blur-xl lg:top-[72px]">
        <div v-if="data.categories.length" class="mk-no-scrollbar mk-fade-right flex min-w-0 flex-1 gap-2 overflow-x-auto pr-6" role="tablist" :aria-label="messages.storefront.categories">
          <button
            v-for="item in categoryTabs"
            :key="String(item.id)"
            type="button"
            role="tab"
            :aria-selected="selectedCategory === item.id"
            class="h-11 shrink-0 rounded-full border px-5 text-sm font-medium transition-colors duration-300 hover:border-foreground aria-selected:border-foreground aria-selected:bg-foreground aria-selected:text-background md:h-10"
            @click="selectCategory(item.id)"
          >
            {{ item.name }}<span class="ml-1.5 text-xs tabular-nums opacity-60">{{ item.count }}</span>
          </button>
        </div>
        <div v-else class="flex-1" />
        <div class="shrink-0">
          <SortSelect v-model="sort" />
        </div>
      </div>

      <!-- Header search lands here as ?q=; show what was searched and a way out. -->
      <div v-if="query" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-live="polite">
        <span>{{ t(messages.storefront.relatedProducts, { count: visibleProducts.length }) }} · “{{ query }}”</span>
        <button type="button" class="inline-flex h-11 items-center font-medium text-foreground underline-offset-4 hover:underline md:h-8" @click="query = ''">{{ messages.shop.clearSearch }}</button>
      </div>

      <TransitionGroup v-if="visibleProducts.length" tag="div" name="mk-grid" class="mt-4 grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-5 md:grid-cols-3 lg:gap-x-7 lg:gap-y-10 xl:grid-cols-4">
        <ProductCard v-for="(product, index) in visibleProducts" :key="product.id" :product="product" :eager="index < 4" />
      </TransitionGroup>

      <div v-else class="mt-4 grid place-items-center rounded-[24px] border border-dashed px-6 py-20 text-center">
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
import { computed, defineAsyncComponent, hydrateOnVisible, onMounted, ref, watch } from "vue";
import { HeadphonesIcon, PackageOpenIcon, ReceiptTextIcon, ShieldCheckIcon, ZapIcon } from "@lucide/vue";
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import ProductCard from "@/components/storefront/ProductCard.vue";
import StoreShell from "@/components/storefront/StoreShell.vue";
import { Button } from "@/components/ui/button";
import type { Data } from "./+data.server";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

// Sort menu is SSR-rendered, hydrated (and its Reka Select code fetched) only when scrolled into view.
const SortSelect = defineAsyncComponent({ loader: () => import("@/components/storefront/SortSelect.vue"), hydrate: hydrateOnVisible({ rootMargin: "200px" }) });


const data = useData<Data>();
const pageContext = usePageContext() as unknown as { user?: { id: string } | null; urlParsed: { search: Record<string, string | undefined> } };
const { messages, t } = useStorefrontPreferences();
const initialCategory = Number(pageContext.urlParsed.search.category);
const selectedCategory = ref<number | null>(Number.isInteger(initialCategory) && data.categories.some((item) => item.id === initialCategory) ? initialCategory : null);
const query = ref(pageContext.urlParsed.search.q?.trim() ?? "");
const sort = ref<"default" | "price-asc" | "price-desc">("default");

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

// Keep ?q= / ?category= in the URL (shareable, survives reload) without adding history entries.
watch([query, selectedCategory], ([q, category]) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (q.trim()) url.searchParams.set("q", q.trim()); else url.searchParams.delete("q");
  if (category !== null) url.searchParams.set("category", String(category)); else url.searchParams.delete("category");
  window.history.replaceState(window.history.state, "", url);
});
// Category links in the menu drawer navigate to /?category=… while this page stays mounted.
watch(() => pageContext.urlParsed.search.category, (value) => {
  const id = Number(value);
  selectedCategory.value = Number.isInteger(id) && data.categories.some((item) => item.id === id) ? id : null;
});
onMounted(() => {
  if (window.location.hash === "#products" || query.value || selectedCategory.value !== null) {
    requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ block: "start" }));
  }
});
</script>

<style scoped>
.mk-fade-right { mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
.mk-grid-move { transition: transform 0.6s var(--ease-out-expo); }
.mk-grid-enter-active { transition: opacity 0.45s var(--ease-out-expo), transform 0.45s var(--ease-out-expo); }
.mk-grid-enter-from { opacity: 0; transform: translateY(12px) scale(0.98); }
.mk-grid-leave-active { display: none; }
</style>
