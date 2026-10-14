<template>
  <nav class="flex shrink-0 items-center gap-0.5 sm:gap-1" :aria-label="messages.nav.utility">
    <LocaleMenu />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="hidden rounded-full md:inline-flex"
      :aria-label="theme === 'light' ? messages.preferences.dark : messages.preferences.light"
      :title="theme === 'light' ? messages.preferences.dark : messages.preferences.light"
      @click="setTheme(theme === 'light' ? 'dark' : 'light')"
    >
      <Transition name="mk-icon" mode="out-in">
        <SunIcon v-if="theme === 'light'" key="sun" />
        <MoonIcon v-else key="moon" />
      </Transition>
    </Button>
    <template v-if="!user">
      <Button size="sm" class="ml-1 h-11 rounded-full px-4 sm:px-5 md:h-9" as-child><a href="/login">{{ messages.nav.signIn }}</a></Button>
    </template>
    <AccountMenu v-else :user="user" />
  </nav>
</template>

<script setup lang="ts">
import { defineAsyncComponent, hydrateOnIdle, hydrateOnVisible } from "vue";
import { MoonIcon, SunIcon } from "@lucide/vue";
import { usePageContext } from "vike-vue/usePageContext";
import { Button } from "@/components/ui/button";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

type PublicUser = { id: string; name?: string | null; email?: string | null };

// Menus are SSR-rendered but hydrated lazily so Reka's dropdown code is not on the critical path:
// the language menu only once visible (it is hidden below md, so phones never load it), the account menu when idle.
const LocaleMenu = defineAsyncComponent({ loader: () => import("@/components/storefront/LocaleMenu.vue"), hydrate: hydrateOnVisible() });
const AccountMenu = defineAsyncComponent({ loader: () => import("@/components/storefront/AccountMenu.vue"), hydrate: hydrateOnIdle(1500) });

const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { user?: PublicUser | null };
const user = pageContext.user ?? null;
const { messages, setTheme, theme } = useStorefrontPreferences();
</script>

<style scoped>
.mk-icon-enter-active, .mk-icon-leave-active { transition: opacity 0.2s ease, transform 0.35s var(--ease-out-expo); }
.mk-icon-enter-from { opacity: 0; transform: rotate(-60deg) scale(0.6); }
.mk-icon-leave-to { opacity: 0; transform: rotate(60deg) scale(0.6); }
</style>
