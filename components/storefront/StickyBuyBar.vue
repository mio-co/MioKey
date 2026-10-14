<template>
  <div :data-hidden="hidden ? 'true' : undefined" :inert="hidden || undefined" class="mk-sticky-buy transition-[translate,opacity] duration-500 ease-out-expo data-[hidden=true]:pointer-events-none data-[hidden=true]:translate-y-full data-[hidden=true]:opacity-0">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Phone sticky purchase bar: hidden while the in-page submit button (`target`) is on screen,
 * so the two CTAs never show at the same time (amaeru.com / Rawjoy sticky add-to-cart pattern).
 * Purely presentational: the slot keeps its own submit button and form binding.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ target: string }>();
const hidden = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const element = document.querySelector(props.target);
  if (!element || typeof IntersectionObserver === "undefined") return;
  observer = new IntersectionObserver(([entry]) => { hidden.value = Boolean(entry?.isIntersecting); }, { threshold: 0.6 });
  observer.observe(element);
});

onBeforeUnmount(() => observer?.disconnect());
</script>
