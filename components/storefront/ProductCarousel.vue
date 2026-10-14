<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import emblaCarouselVue from "embla-carousel-vue";
import { ChevronLeftIcon, ChevronRightIcon } from "@lucide/vue";
import defaultProductImage from "@/assets/product_img.jpg?url";
import type { CardProduct } from "@/components/storefront/ProductCard.vue";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/** Hero slideshow of featured products (embla, loop, autoplay that pauses on hover/focus/touch and for reduced motion). */
const props = defineProps<{ products: CardProduct[] }>();
const { messages, t } = useStorefrontPreferences();
const priceText = (product: CardProduct) => ((product.skuCount ?? 1) > 1 && product.minPrice ? t(messages.value.shop.fromPrice, { price: product.minPrice }) : `¥${product.price}`);
const [viewport, api] = emblaCarouselVue({ loop: true, align: "start", duration: 32 });
const index = ref(0);
const count = computed(() => props.products.length);
let timer: ReturnType<typeof setInterval> | undefined;
let paused = false;

function start() {
  stop();
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || count.value < 2) return;
  timer = setInterval(() => { if (!paused && !document.hidden) api.value?.scrollNext(); }, 5500);
}
function stop() { if (timer) clearInterval(timer); timer = undefined; }
watch(api, (embla) => {
  if (!embla) return;
  const sync = () => { index.value = embla.selectedScrollSnap(); };
  embla.on("select", sync).on("reInit", sync).on("pointerDown", () => { paused = true; });
  sync();
  start();
});
onBeforeUnmount(stop);
</script>

<template>
  <div class="relative" role="region" aria-roledescription="carousel" :aria-label="messages.shop.featured" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div ref="viewport" class="overflow-hidden rounded-[24px]">
      <div class="flex touch-pan-y">
        <div
          v-for="(product, i) in products"
          :key="product.id"
          class="min-w-0 shrink-0 grow-0 basis-full"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${i + 1} / ${count}`"
        >
          <a :href="`/product/${product.slug}`" class="group relative block">
            <div class="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-[16/11]">
              <img :src="product.coverImage || defaultProductImage" :alt="product.name" width="800" height="600" :loading="i < 3 ? 'eager' : 'lazy'" :fetchpriority="i === 0 ? 'high' : undefined" :decoding="i === 0 ? 'sync' : 'async'" class="size-full object-cover transition-transform duration-[1300ms] ease-out-expo group-hover:scale-105" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-7">
                <div class="min-w-0">
                  <p v-if="product.categoryName" class="mk-eyebrow text-white/75">{{ product.categoryName }}</p>
                  <p class="mk-h3 mt-1 line-clamp-2">{{ product.name }}</p>
                  <p class="mk-display mt-1 text-lg tabular-nums">{{ priceText(product) }}</p>
                </div>
                <span class="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-500 ease-out-expo group-hover:-rotate-45"><ChevronRightIcon class="size-5" /></span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
    <div v-if="count > 1" class="mt-4 flex items-center justify-between gap-4">
      <div class="relative h-0.5 w-40 overflow-hidden rounded-full bg-foreground/10 sm:w-56" aria-hidden="true">
        <span class="absolute inset-y-0 rounded-full bg-foreground transition-[left] duration-500 ease-out-expo" :style="{ width: `${100 / count}%`, left: `${(index * 100) / count}%` }" />
      </div>
      <div class="flex gap-2">
        <button type="button" class="grid size-11 place-items-center rounded-full border border-foreground/20 transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background" :aria-label="messages.shop.prev" @click="api?.scrollPrev()"><ChevronLeftIcon class="size-5" /></button>
        <button type="button" class="grid size-11 place-items-center rounded-full border border-foreground/20 transition-colors duration-300 hover:border-foreground hover:bg-foreground hover:text-background" :aria-label="messages.shop.next" @click="api?.scrollNext()"><ChevronRightIcon class="size-5" /></button>
      </div>
    </div>
  </div>
</template>
