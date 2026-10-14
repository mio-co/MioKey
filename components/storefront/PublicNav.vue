<template>
  <nav class="flex shrink-0 items-center gap-0.5 sm:gap-1" :aria-label="messages.nav.main">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" variant="ghost" size="icon" class="hidden rounded-full md:inline-flex" :aria-label="messages.preferences.language" :title="messages.preferences.language">
          <LanguagesIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" :side-offset="10" class="w-40 rounded-2xl p-1.5">
        <DropdownMenuLabel class="text-xs text-muted-foreground">{{ messages.preferences.language }}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem class="rounded-xl" @select="setLocale('zh-CN')">{{ zhCN.languageName }}</DropdownMenuItem>
          <DropdownMenuItem class="rounded-xl" @select="setLocale('zh-TW')">{{ zhTW.languageName }}</DropdownMenuItem>
          <DropdownMenuItem class="rounded-xl" @select="setLocale('en-US')">{{ enUS.languageName }}</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
      <Button size="sm" class="ml-1 h-10 rounded-full px-4 sm:px-5 md:h-9" as-child><a href="/login">{{ messages.nav.signIn }}</a></Button>
    </template>
    <template v-else>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="icon" class="ml-1 rounded-full" :aria-label="t(messages.nav.accountMenu, { name: currentUserName })">
            <Avatar class="size-8 ring-1 ring-border"><AvatarFallback class="bg-foreground text-xs font-semibold text-background">{{ userInitials }}</AvatarFallback></Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" :side-offset="10" class="w-56 rounded-2xl p-1.5">
          <DropdownMenuLabel class="truncate">{{ currentUserName }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem class="rounded-xl" as-child><a href="/account/order"><ClipboardListIcon data-icon="inline-start" />{{ messages.nav.myOrders }}</a></DropdownMenuItem>
            <DropdownMenuItem class="rounded-xl" as-child><a href="/account"><UserRoundCogIcon data-icon="inline-start" />{{ messages.nav.accountSettings }}</a></DropdownMenuItem>
            <DropdownMenuItem class="rounded-xl" :disabled="signingOut" @select="signOut"><LogOutIcon data-icon="inline-start" />{{ signingOut ? messages.nav.signingOut : messages.nav.signOut }}</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ClipboardListIcon, LanguagesIcon, LogOutIcon, MoonIcon, SunIcon, UserRoundCogIcon } from "@lucide/vue";

import { usePageContext } from "vike-vue/usePageContext";
import { toast } from "vue-sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import enUS from "@/lib/i18n/en-US";
import zhCN from "@/lib/i18n/zh-CN";
import zhTW from "@/lib/i18n/zh-TW";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

type PublicUser = { id: string; name?: string | null; email?: string | null };

const pageContext = usePageContext() as ReturnType<typeof usePageContext> & { user?: PublicUser | null };
const user = pageContext.user ?? null;
const currentUserName = computed(() => user?.name?.trim() || user?.email || messages.value.nav.account);
const userInitials = computed(() => currentUserName.value.slice(0, 1).toUpperCase());
const signingOut = ref(false);
const { messages, setLocale, setTheme, t, theme } = useStorefrontPreferences();

async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    const result = await authClient.signOut();
    if (result.error) {
      toast.error(messages.value.nav.signOutFailed);
      return;
    }
    toast.success(messages.value.nav.signedOut);
    window.location.assign("/");
  } catch {
    toast.error(messages.value.nav.signOutFailed);
  } finally {
    signingOut.value = false;
  }
}
</script>

<style scoped>
.mk-icon-enter-active, .mk-icon-leave-active { transition: opacity 0.2s ease, transform 0.35s var(--ease-out-expo); }
.mk-icon-enter-from { opacity: 0; transform: rotate(-60deg) scale(0.6); }
.mk-icon-leave-to { opacity: 0; transform: rotate(60deg) scale(0.6); }
</style>
