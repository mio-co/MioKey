<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  /** Heading element to render; defaults to h3. Lets pages keep a valid heading order. */
  as?: "h1" | "h2" | "h3" | "h4" | "div"
}>()
</script>

<template>
  <component
    :is="props.as ?? 'h3'"
    data-slot="card-title"
    :class="cn('leading-none font-semibold', props.class)"
  >
    <slot />
  </component>
</template>
