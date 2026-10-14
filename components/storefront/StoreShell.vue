<script setup lang="ts">
import StoreHeader, { type HeaderCategory, type HeaderProduct } from "@/components/storefront/StoreHeader.vue";
import StorefrontFooter from "@/components/storefront/StorefrontFooter.vue";

/** Shared storefront frame: announcement bar + sticky header, page content, footer. */
withDefaults(defineProps<{ products?: HeaderProduct[]; categories?: HeaderCategory[]; narrow?: boolean; tone?: "plain" | "muted" }>(), { products: () => [], categories: () => [], narrow: false, tone: "plain" });
</script>

<template>
  <div :class="['mk-store flex min-h-dvh flex-col', tone === 'muted' ? 'bg-muted/40' : 'bg-background']">
    <StoreHeader :products="products" :categories="categories" :narrow="narrow" />
    <main id="main" class="flex flex-1 flex-col">
      <slot />
    </main>
    <StorefrontFooter />
  </div>
</template>
