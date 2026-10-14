<template>
  <StoreShell>
    <section class="mk-page grid flex-1 place-items-center py-20 sm:py-28">
      <div class="max-w-xl text-center">
        <p class="mk-eyebrow text-muted-foreground">{{ is404 ? messages.common.notFoundEyebrow : messages.common.errorEyebrow }}</p>
        <h1 class="mk-h1 mt-3" data-testid="error-title">{{ is404 ? messages.common.notFoundTitle : messages.common.errorTitle }}</h1>
        <p class="mx-auto mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">{{ detail }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/" class="mk-sweep inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background">{{ messages.common.backHome }}<ArrowRightIcon class="size-4" /></a>
          <a v-if="is404" href="/order" class="inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold transition-colors hover:bg-muted">{{ messages.common.lookupOrder }}</a>
          <button v-else type="button" class="inline-flex h-12 items-center rounded-full border px-6 text-sm font-semibold transition-colors hover:bg-muted" @click="reload">{{ messages.common.retry }}</button>
        </div>
      </div>
    </section>
  </StoreShell>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { ArrowRightIcon } from "@lucide/vue";
import { usePageContext } from "vike-vue/usePageContext";
import StoreShell from "@/components/storefront/StoreShell.vue";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

const pageContext = usePageContext();
const { messages } = useStorefrontPreferences();
const is404 = !!pageContext.is404;
// A reason passed to `throw render(code, reason)` is shown as-is; otherwise friendly, localized copy.
const detail = computed(() => (typeof pageContext.abortReason === "string" && pageContext.abortReason) || (is404 ? messages.value.common.notFoundText : messages.value.common.errorText));
function reload() { window.location.reload(); }
</script>
