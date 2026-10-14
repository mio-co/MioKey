<script setup lang="ts">
import { computed } from "vue";
import { ArrowUpRightIcon } from "@lucide/vue";
import defaultProductImage from "@/assets/product_img.jpg?url";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

export type CardProduct = { id: number; name: string; slug: string; subtitle: string | null; coverImage: string | null; price: string; categoryName: string | null; availableStock: number | null };

const props = defineProps<{ product: CardProduct; eager?: boolean }>();
const { messages, t } = useStorefrontPreferences();
const soldOut = computed(() => props.product.availableStock === 0);
const lowStock = computed(() => props.product.availableStock !== null && props.product.availableStock > 0 && props.product.availableStock <= 5);
const stockText = computed(() => {
  const stock = props.product.availableStock;
  if (stock === null) return messages.value.storefront.stockAvailable;
  if (stock === 0) return messages.value.shop.soldOut;
  if (lowStock.value) return t(messages.value.shop.lowStock, { count: stock });
  return t(messages.value.storefront.stockCount, { count: stock });
});
</script>

<template>
  <article class="mk-card group relative flex min-w-0 flex-col" :data-testid="`product-card-${product.slug}`">
    <a :href="`/product/${product.slug}`" class="mk-card-media block aspect-[4/3]" :aria-label="product.name">
      <img :src="product.coverImage || defaultProductImage" :alt="product.name" width="800" height="600" :loading="eager ? 'eager' : 'lazy'" decoding="async" :class="['size-full object-cover', soldOut ? 'opacity-60 grayscale' : '']" />
      <span class="absolute left-3 top-3 flex flex-wrap gap-1.5">
        <span v-if="soldOut" class="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold leading-none text-background">{{ messages.shop.soldOut }}</span>
        <span v-else-if="lowStock" class="rounded-full bg-[#fda084] px-2.5 py-1 text-[11px] font-semibold leading-none text-black">{{ stockText }}</span>
      </span>
      <span class="mk-quick absolute inset-x-3 bottom-3 flex h-11 items-center justify-center gap-1.5 rounded-full bg-background/95 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
        {{ soldOut ? messages.shop.viewDetails : messages.shop.buyNow }}<ArrowUpRightIcon class="size-4" />
      </span>
    </a>
    <div class="flex flex-1 flex-col px-1 pt-3.5">
      <p v-if="product.categoryName" class="truncate text-xs text-muted-foreground">{{ product.categoryName }}</p>
      <h3 class="mk-display mt-0.5 line-clamp-2 text-[15px] leading-6 sm:text-base"><a :href="`/product/${product.slug}`" class="mk-link">{{ product.name }}</a></h3>
      <p v-if="product.subtitle" class="mt-1 line-clamp-1 text-[13px] text-muted-foreground">{{ product.subtitle }}</p>
      <div class="mt-auto flex items-end justify-between gap-2 pt-2.5">
        <span class="mk-display text-base tabular-nums sm:text-[17px]">¥{{ product.price }}</span>
        <span :class="['text-xs', soldOut ? 'text-muted-foreground' : lowStock ? 'text-warning' : 'text-success']">{{ stockText }}</span>
      </div>
    </div>
  </article>
</template>
