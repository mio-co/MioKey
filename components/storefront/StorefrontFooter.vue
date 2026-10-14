<template>
  <footer class="mk-store mt-auto border-t bg-muted/40">
    <div class="mk-page flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between md:gap-12 md:py-12">
      <div class="max-w-sm">
        <StorefrontBrand />
        <p v-if="description" class="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{{ description }}</p>
      </div>
      <nav :aria-label="messages.shop.footerHelp">
        <ul class="flex flex-wrap gap-x-6 text-sm text-muted-foreground md:justify-end">
          <li><a href="/order" class="mk-link inline-flex min-h-11 items-center hover:text-foreground">{{ messages.nav.orderLookup }}</a></li>
          <li><a href="/account/order" class="mk-link inline-flex min-h-11 items-center hover:text-foreground">{{ messages.nav.myOrders }}</a></li>
          <li v-for="contact in supportContacts" :key="`${contact.label}-${contact.href}`">
            <a :href="contact.href" class="mk-link inline-flex min-h-11 items-center gap-1.5 hover:text-foreground" target="_blank" rel="noopener noreferrer"><HeadphonesIcon class="size-3.5" />{{ contact.label }}</a>
          </li>
        </ul>
      </nav>
    </div>
    <div class="border-t">
      <div class="mk-page flex items-center justify-between gap-4 py-3 text-xs text-muted-foreground sm:py-4">
        <p class="min-w-0">© {{ year }} {{ siteName }} <span aria-hidden="true">·</span> {{ messages.shop.poweredBy }}</p>
        <button type="button" class="mk-link inline-flex min-h-11 shrink-0 items-center sm:min-h-0" @click="scrollToTop">{{ messages.shop.backToTop }} ↑</button>
      </div>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { HeadphonesIcon } from "@lucide/vue";
import { usePageContext } from "vike-vue/usePageContext";

import StorefrontBrand from "@/components/storefront/StorefrontBrand.vue";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

type Site = {
  name?: string | null;
  subtitle?: string | null;
  supportContact: string | null;
  footerText: string | null;
};

type SupportContact = {
  label: string;
  href: string;
};

const pageContext = usePageContext() as unknown as { site: Site };
const site = pageContext.site;
const { messages } = useStorefrontPreferences();
const siteName = computed(() => site.name?.trim() || "MioKey");
const description = computed(() => site.footerText?.trim() || site.subtitle?.trim() || "");
const year = new Date().getFullYear();
const supportContacts = computed<SupportContact[]>(() => (site.supportContact ?? "")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separatorIndex = line.indexOf("|");
    const label = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line;
    const address = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;
    if (!label || !address) return null;
    return { label, href: address.includes(":") ? address : `mailto:${address}` };
  })
  .filter((contact): contact is SupportContact => contact !== null));
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>
