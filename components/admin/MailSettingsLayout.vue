<script setup lang="ts">
import { computed } from "vue";
import { adminNavigation, adminPages, getAdminPageMeta, isNavigationModule } from "@/lib/admin-navigation";
import { usePageContext } from "vike-vue/usePageContext";

const pageContext = usePageContext();
const basePath = computed(() => `/${pageContext.routeParams.adminPath}`);
const currentPath = computed(() => pageContext.urlPathname.replace(/\/$/, ""));
const page = computed(() => getAdminPageMeta(pageContext.urlPathname, basePath.value));
const items = computed(() => {
  const pushItems = adminNavigation.push.items;
  const emailItem = pushItems.find((item) => item.path === adminPages.email.path);
  return emailItem && isNavigationModule(emailItem) ? [emailItem, ...emailItem.items] : [adminPages.email];
});

function isActive(path: string) {
  return currentPath.value === `${basePath.value}${path}`;
}
</script>

<template>
  <section class="flex w-full flex-col gap-6">
    <div>
      <h1 class="mk-display text-[22px] leading-tight sm:text-[26px]">{{ page?.pageTitle }}</h1>
      <p v-if="page?.description" class="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{{ page.description }}</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
      <nav class="mk-subnav mk-no-scrollbar flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start" aria-label="邮件配置">
        <a
          v-for="item in items"
          :key="item.path"
          :href="basePath + item.path"
          class="shrink-0 rounded-full px-4 py-2 text-sm transition-colors hover:bg-muted lg:rounded-xl"
          :class="isActive(item.path) ? 'bg-foreground font-medium text-background hover:bg-foreground' : 'text-muted-foreground'"
          :aria-current="isActive(item.path) ? 'page' : undefined"
        >
          {{ item.title }}
        </a>
      </nav>

      <div class="min-w-0">
        <slot />
      </div>
    </div>
  </section>
</template>
