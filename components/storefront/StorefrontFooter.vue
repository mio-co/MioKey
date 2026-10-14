<template>
  <footer class="mk-store mt-auto border-t bg-muted/40">
    <div class="mk-page grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] md:py-16">
      <div class="col-span-2 max-w-sm md:col-span-1">
        <StorefrontBrand />
        <p v-if="description" class="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{{ description }}</p>
      </div>
      <div>
        <p class="mk-display text-[15px]">{{ messages.shop.footerHelp }}</p>
        <ul class="mt-2 grid text-sm text-muted-foreground md:mt-4 md:gap-2.5">
          <li><a href="/order" class="mk-link inline-flex min-h-11 items-center hover:text-foreground md:min-h-0">{{ messages.nav.orderLookup }}</a></li>
          <li v-for="contact in supportContacts" :key="`${contact.label}-${contact.href}`">
            <a :href="contact.href" class="mk-link inline-flex min-h-11 items-center gap-1.5 hover:text-foreground md:min-h-0" target="_blank" rel="noopener noreferrer"><HeadphonesIcon class="size-3.5" />{{ contact.label }}</a>
          </li>
        </ul>
      </div>
      <div>
        <p class="mk-display text-[15px]">{{ messages.shop.footerAccount }}</p>
        <ul class="mt-2 grid text-sm text-muted-foreground md:mt-4 md:gap-2.5">
          <li><a href="/account/order" class="mk-link inline-flex min-h-11 items-center hover:text-foreground md:min-h-0">{{ messages.nav.myOrders }}</a></li>
          <li><a href="/account" class="mk-link inline-flex min-h-11 items-center hover:text-foreground md:min-h-0">{{ messages.nav.accountSettings }}</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t">
      <div class="mk-page flex flex-col items-start gap-1 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5">
        <p>© {{ year }} {{ siteName }}</p>
        <a href="https://github.com/mio-co/MioKey" class="mk-link inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0" target="_blank" rel="noopener noreferrer">
          <svg class="size-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
          {{ messages.shop.poweredBy }}
        </a>
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
</script>
