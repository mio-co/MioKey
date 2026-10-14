<template>
  <div class="grid gap-2" data-testid="delivery-contents">
    <ol class="grid gap-2">
      <li v-for="(item, index) in items" :key="index" class="flex min-w-0 items-start gap-2 rounded-[14px] border bg-muted/40 py-1.5 pl-4 pr-1.5">
        <span class="sr-only">{{ t(messages.shop.deliveryItem, { index: index + 1 }) }}</span>
        <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all py-2 font-mono text-[13px] leading-6 select-all">{{ item }}</pre>
        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors hover:bg-background focus-visible:bg-background"
          :aria-label="`${messages.shop.copy} ${t(messages.shop.deliveryItem, { index: index + 1 })}`"
          data-testid="delivery-copy"
          @click="copy(item, index)"
        >
          <CheckIcon v-if="copiedIndex === index" class="size-4 text-success" />
          <CopyIcon v-else class="size-4" />
          <span aria-hidden="true">{{ copiedIndex === index ? messages.shop.copied : messages.shop.copy }}</span>
        </button>
      </li>
    </ol>
    <button
      v-if="items.length > 1"
      type="button"
      class="inline-flex h-11 items-center justify-center gap-1.5 justify-self-start rounded-full border px-4 text-xs font-semibold transition-colors hover:bg-muted"
      data-testid="delivery-copy-all"
      @click="copy(items.join('\n'), -1)"
    >
      <CheckIcon v-if="copiedIndex === -1" class="size-4 text-success" />
      <CopyIcon v-else class="size-4" />
      {{ copiedIndex === -1 ? messages.shop.copied : messages.shop.copyAll }}
    </button>
    <p class="sr-only" aria-live="polite">{{ copiedIndex !== null ? messages.shop.copied : "" }}</p>
  </div>
</template>

<script setup lang="ts">
/** Delivered card codes / delivery notes, one row per item with a copy button (plus "copy all"). Display only. */
import { onBeforeUnmount, ref } from "vue";
import { CheckIcon, CopyIcon } from "@lucide/vue";
import { toast } from "vue-sonner";

import { useStorefrontPreferences } from "@/lib/storefront-preferences";

defineProps<{ items: string[] }>();

const { messages, t } = useStorefrontPreferences();
const copiedIndex = ref<number | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy(text: string, index: number) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) throw new Error("copy failed");
    }
    copiedIndex.value = index;
    clearTimeout(timer);
    timer = setTimeout(() => { copiedIndex.value = null; }, 1800);
  } catch {
    toast.error(messages.value.shop.copyFailed);
  }
}

onBeforeUnmount(() => clearTimeout(timer));
</script>
