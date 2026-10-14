<template>
  <a href="/" class="group flex min-w-0 items-center gap-2.5" aria-label="返回首页">
    <img :src="brandLogoUrl" :alt="`${siteName} Logo`" class="size-8 shrink-0 rounded-[10px] object-contain transition-transform duration-500 ease-out-expo group-hover:-rotate-6 lg:size-9" />
    <span class="mk-display truncate text-[17px] lg:text-lg">{{ siteName }}</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { usePageContext } from "vike-vue/usePageContext";

import logoUrl from "@/assets/logo.svg?url";

type Site = { name?: string | null; logo?: string | null };
type PageContext = ReturnType<typeof usePageContext> & { site?: Site | null };

const pageContext = usePageContext() as PageContext;
const siteName = computed(() => pageContext.site?.name?.trim() || "MioKey");
const brandLogoUrl = computed(() => pageContext.site?.logo || logoUrl);
</script>
