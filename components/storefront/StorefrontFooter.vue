<template>
  <footer class="mk-store mt-auto border-t bg-muted/40">
    <div class="mk-page grid gap-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:py-16">
      <div class="max-w-sm">
        <StorefrontBrand />
        <p v-if="site.footerText" class="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{{ site.footerText }}</p>
      </div>
      <div>
        <p class="mk-display text-[15px]">{{ messages.shop.footerShop }}</p>
        <ul class="mt-4 grid gap-2.5 text-sm text-muted-foreground">
          <li><a href="/" class="mk-link hover:text-foreground">{{ messages.shop.home }}</a></li>
          <li><a href="/#products" class="mk-link hover:text-foreground">{{ messages.shop.allProducts }}</a></li>
        </ul>
      </div>
      <div>
        <p class="mk-display text-[15px]">{{ messages.shop.footerHelp }}</p>
        <ul class="mt-4 grid gap-2.5 text-sm text-muted-foreground">
          <li><a href="/order" class="mk-link hover:text-foreground">{{ messages.nav.orderLookup }}</a></li>
          <li v-for="contact in supportContacts" :key="`${contact.label}-${contact.href}`">
            <a :href="contact.href" class="mk-link inline-flex items-center gap-1.5 hover:text-foreground" target="_blank" rel="noopener noreferrer"><HeadphonesIcon class="size-3.5" />{{ contact.label }}</a>
          </li>
        </ul>
      </div>
      <div>
        <p class="mk-display text-[15px]">{{ messages.shop.footerAccount }}</p>
        <ul class="mt-4 grid gap-2.5 text-sm text-muted-foreground">
          <li><a href="/account/order" class="mk-link hover:text-foreground">{{ messages.nav.myOrders }}</a></li>
          <li><a href="/account" class="mk-link hover:text-foreground">{{ messages.nav.accountSettings }}</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t">
      <div class="mk-page flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{{ messages.shop.poweredBy }}</p>
        <button type="button" class="mk-link self-start sm:self-auto" @click="scrollToTop">{{ messages.shop.backToTop }} ↑</button>
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
