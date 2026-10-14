<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { observeReveal } from "@/lib/ui/reveal";

const props = withDefaults(defineProps<{ as?: string; delay?: number }>(), { as: "div", delay: 0 });
const el = ref<HTMLElement | null>(null);
let stop: () => void = () => undefined;
onMounted(() => { if (el.value) stop = observeReveal(el.value); });
onBeforeUnmount(() => stop());
</script>

<template>
  <component :is="props.as" ref="el" class="mk-reveal" :style="props.delay ? { '--mk-delay': `${props.delay}ms` } : undefined"><slot /></component>
</template>
