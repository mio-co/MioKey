<script setup lang="ts">
import { ArrowLeftIcon } from "@lucide/vue";
import { usePageContext } from "vike-vue/usePageContext";

import StorefrontBrand from "@/components/storefront/StorefrontBrand.vue";
import StorefrontPreferences from "@/components/storefront/StorefrontPreferences.vue";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/**
 * Frame for sign-in style pages: a dark brand panel on desktop, a quiet single column on phones.
 * Pages pass their form (usually a shadcn Card) in the default slot; `.mk-auth` flattens that card
 * so the title carries the hierarchy. The `aside` slot replaces the panel copy.
 */
const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { site?: { name?: string | null; subtitle?: string | null } | null };
const { messages } = useStorefrontPreferences();
const tagline = pageContext.site?.subtitle?.trim() || "";
</script>

<template>
  <main class="mk-store grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <aside class="relative m-3 hidden overflow-hidden rounded-[28px] bg-foreground p-10 text-background lg:flex lg:flex-col xl:p-14">
      <div class="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-background/[0.06]" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-40 -left-20 size-[520px] rounded-full bg-background/[0.04]" aria-hidden="true" />
      <div class="relative"><StorefrontBrand /></div>
      <div class="relative my-auto max-w-lg py-12">
        <slot name="aside">
          <p class="mk-eyebrow text-background/60">{{ messages.shop.heroEyebrow }}</p>
          <p class="mt-5 whitespace-pre-line font-display text-[clamp(32px,3.4vw,52px)] font-semibold leading-[1.1] tracking-[-0.02em]">{{ tagline || messages.shop.heroTitle }}</p>
          <p class="mt-6 max-w-sm text-base leading-7 text-background/70">{{ messages.shop.heroText }}</p>
        </slot>
      </div>
      <p class="relative text-xs text-background/50">{{ messages.shop.poweredBy }}</p>
    </aside>

    <section class="flex min-h-dvh min-w-0 flex-col">
      <header class="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-8 lg:h-20">
        <div class="lg:hidden"><StorefrontBrand /></div>
        <a href="/" class="mk-link hidden items-center gap-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"><ArrowLeftIcon class="size-4" />{{ messages.shop.home }}</a>
        <StorefrontPreferences />
      </header>
      <div class="flex flex-1 items-start justify-center px-5 pb-12 pt-6 sm:items-center sm:px-8 sm:pt-0">
        <div class="mk-auth w-full max-w-[420px] animate-fade-up">
          <slot />
        </div>
      </div>
    </section>
  </main>
</template>
