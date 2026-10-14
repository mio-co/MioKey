<template>
  <Select v-model="model">
    <SelectTrigger class="w-auto min-w-36" :aria-label="messages.shop.sortLabel"><SelectValue /></SelectTrigger>
    <SelectContent class="rounded-2xl">
      <SelectItem value="default">{{ messages.shop.sortDefault }}</SelectItem>
      <SelectItem value="price-asc">{{ messages.shop.sortPriceAsc }}</SelectItem>
      <SelectItem value="price-desc">{{ messages.shop.sortPriceDesc }}</SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/** Home product sort. Its own component so the home page can hydrate it lazily (Reka Select stays off the critical path). */
const model = defineModel<"default" | "price-asc" | "price-desc">({ required: true });
const { messages } = useStorefrontPreferences();
</script>
