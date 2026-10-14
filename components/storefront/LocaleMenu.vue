<template>
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
</template>

<script setup lang="ts">
import { LanguagesIcon } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import enUS from "@/lib/i18n/en-US";
import zhCN from "@/lib/i18n/zh-CN";
import zhTW from "@/lib/i18n/zh-TW";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";

/** Header language menu. Split out of PublicNav so Reka's dropdown code is lazily hydrated (see PublicNav). */
const { messages, setLocale } = useStorefrontPreferences();
</script>
