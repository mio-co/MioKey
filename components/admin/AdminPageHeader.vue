<script setup lang="ts">
import { computed } from "vue";
import { getAdminPageMeta } from "@/lib/admin-navigation";
import { usePageContext } from "vike-vue/usePageContext";

const pageContext = usePageContext();
const basePath = computed(() => `/${pageContext.routeParams.adminPath}`);
const page = computed(() => getAdminPageMeta(pageContext.urlPathname, basePath.value));
</script>

<template>
  <div class="mk-admin-head flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
    <div class="min-w-0">
      <h1 class="mk-display text-[22px] leading-tight sm:text-[26px]">{{ page?.pageTitle ?? page?.title }}</h1>
      <p v-if="page?.description" class="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{{ page.description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
