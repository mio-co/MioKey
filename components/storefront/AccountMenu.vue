<template>
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

<script setup lang="ts">
import { computed, ref } from "vue";
import { ClipboardListIcon, LogOutIcon, UserRoundCogIcon } from "@lucide/vue";
import { toast } from "vue-sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/** Signed-in account menu (moved verbatim from PublicNav so it can be lazily hydrated). */
const props = defineProps<{ user: { id: string; name?: string | null; email?: string | null } }>();
const { messages, t } = useStorefrontPreferences();
const currentUserName = computed(() => props.user.name?.trim() || props.user.email || messages.value.nav.account);
const userInitials = computed(() => currentUserName.value.slice(0, 1).toUpperCase());
const signingOut = ref(false);
async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    // Loaded on demand so the better-auth client stays out of every storefront page bundle.
    const { authClient } = await import("@/lib/auth-client");
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
