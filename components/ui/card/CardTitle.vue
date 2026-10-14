<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { inject } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  /** Heading element to render; defaults to h3 (or the layout-provided level). Lets pages keep a valid heading order. */
  as?: "h1" | "h2" | "h3" | "h4" | "div" | "p"
}>()
/** Layouts can lower the default level (admin pages have an h1 page header, so card titles are h2 there). */
const defaultTag = inject<string>("mk-card-title-tag", "h3")
</script>

<template>
  <component
    :is="props.as ?? defaultTag"
    data-slot="card-title"
    :class="cn('leading-none font-semibold', props.class)"
  >
    <slot />
  </component>
</template>
