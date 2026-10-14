<template>
  <Sidebar variant="inset" collapsible="icon" class="mk-admin-sidebar">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" class="h-14 cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" data-testid="admin-brand">
                <img :src="logoUrl" alt="MioKey Logo" class="aspect-square size-9 shrink-0 rounded-xl object-contain" />
                <div class="grid flex-1 text-left leading-tight">
                  <span class="mk-display truncate text-[15px]">MioKey</span>
                  <span class="truncate text-xs text-muted-foreground">系统管理后台</span>
                </div>
                <ChevronsUpDownIcon class="ml-auto opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent :side="isMobile ? 'bottom' : 'right'" align="start" :side-offset="8" class="w-64">
              <DropdownMenuLabel>关于 MioKey</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @select.prevent="checkUpdate">
                  <InfoIcon data-icon="inline-start" />
                  <span>当前版本 v{{ appVersion }}</span>
                  <span class="ml-auto text-xs text-muted-foreground">{{ updateStatus }}</span>
                </DropdownMenuItem>
                <DropdownMenuItem as-child>
                  <a href="https://github.com/mio-co/MioKey" target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon data-icon="inline-start" />
                    GitHub 仓库
                  </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent class="mk-no-scrollbar">
      <nav aria-label="后台导航" class="contents">
        <SidebarGroup v-for="section in sections" :key="section.label">
          <SidebarGroupLabel>{{ section.label }}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <template v-for="entry in section.entries" :key="entry.key">
                <!-- Single page link -->
                <SidebarMenuItem v-if="entry.kind === 'link'" :data-testid="`nav-${entry.key}`">
                  <SidebarMenuButton as-child :is-active="isActive(entry.path)" :tooltip="entry.title">
                    <a :href="basePath + entry.path" :aria-current="isActive(entry.path) ? 'page' : undefined" @click="onNavClick(basePath + entry.path, $event)">
                      <component :is="entry.icon" />
                      <span>{{ entry.title }}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <!-- Group, icon-collapsed desktop rail: flyout menu so the group still works without expanding the rail -->
                <SidebarMenuItem v-else-if="railCollapsed" :data-testid="`nav-${entry.key}`">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <SidebarMenuButton :is-active="isGroupActive(entry)" :tooltip="entry.title">
                        <component :is="entry.icon" />
                        <span>{{ entry.title }}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" :side-offset="10" class="min-w-48">
                      <DropdownMenuLabel>{{ entry.title }}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem v-for="item in entry.items" :key="item.path" as-child>
                        <a :href="basePath + item.path" :aria-current="isActive(item.path) ? 'page' : undefined" :class="isActive(item.path) ? 'font-semibold' : ''">{{ item.title }}</a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>

                <!-- Group, expanded: collapsible with remembered open state -->
                <Collapsible v-else as-child :open="isGroupOpen(entry)" class="group/collapsible" @update:open="setGroupOpen(entry, $event)">
                  <SidebarMenuItem :data-testid="`nav-${entry.key}`">
                    <CollapsibleTrigger as-child>
                      <SidebarMenuButton :tooltip="entry.title" :data-group-active="isGroupActive(entry) || undefined" class="data-[group-active]:font-medium">
                        <component :is="entry.icon" />
                        <span>{{ entry.title }}</span>
                        <span v-if="!isGroupOpen(entry) && isGroupActive(entry)" class="ml-auto size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
                        <ChevronRightIcon :class="['shrink-0 opacity-60 transition-transform duration-300 ease-(--ease-out-expo) group-data-[state=open]/collapsible:rotate-90', !isGroupOpen(entry) && isGroupActive(entry) ? 'ml-1' : 'ml-auto']" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent class="mk-collapsible">
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="item in entry.items" :key="item.path">
                          <SidebarMenuSubButton as-child :is-active="isActive(item.path)">
                            <a :href="basePath + item.path" :aria-current="isActive(item.path) ? 'page' : undefined" @click="onNavClick(basePath + item.path, $event)"><span>{{ item.title }}</span></a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </template>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" class="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" data-testid="admin-user-menu">
                <Avatar class="size-8 rounded-full"><AvatarFallback class="rounded-full bg-foreground text-xs font-semibold text-background">{{ userInitials }}</AvatarFallback></Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">{{ currentUserName }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ currentUserEmail }}</span>
                </div>
                <ChevronsUpDownIcon class="ml-auto opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent :side="isMobile ? 'top' : 'right'" align="end" :side-offset="8" class="w-56">
              <DropdownMenuLabel class="grid leading-tight">
                <span class="truncate">{{ currentUserName }}</span>
                <span class="truncate text-xs font-normal text-muted-foreground">{{ currentUserEmail }}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem as-child>
                  <a :href="basePath + adminPages.account.path" @click="onNavClick(basePath + adminPages.account.path, $event)"><UserRoundCogIcon data-icon="inline-start" />账户设置</a>
                </DropdownMenuItem>
                <DropdownMenuItem @select.prevent="toggleTheme">
                  <component :is="theme === 'dark' ? SunIcon : MoonIcon" data-icon="inline-start" />{{ theme === "dark" ? "浅色模式" : "深色模式" }}
                </DropdownMenuItem>
                <DropdownMenuItem as-child>
                  <a href="/" target="_blank" rel="noopener"><StoreIcon data-icon="inline-start" />查看店铺</a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-destructive focus:text-destructive" @select="onSignOut"><LogOutIcon data-icon="inline-start" />退出登录</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<script lang="ts" setup>
import { CollapsibleContent, CollapsibleRoot as Collapsible, CollapsibleTrigger } from "reka-ui";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { adminNavigation, adminPages, isAdminNavigationItemActive, type AdminNavigationItem } from "@/lib/admin-navigation";
import { useStorefrontPreferences } from "@/lib/storefront-preferences";
import { useDrawerHistory } from "@/lib/ui/drawer-history";
import { BellIcon, ChevronRightIcon, ChevronsUpDownIcon, ClipboardListIcon, ExternalLinkIcon, InfoIcon, KeyRoundIcon, LayoutDashboardIcon, LogOutIcon, MoonIcon, PackageIcon, SettingsIcon, StoreIcon, SunIcon, UserRoundCogIcon, UsersIcon } from "@lucide/vue";
import logoUrl from "@/assets/logo.svg?url";
import { navigate } from "vike/client/router";
import { computed, onMounted, ref, watch, type Component } from "vue";
import { usePageContext } from "vike-vue/usePageContext";

type NavLink = { kind: "link"; key: string; title: string; path: string; icon: Component };
type NavGroup = { kind: "group"; key: string; title: string; icon: Component; items: readonly { title: string; path: string }[] };
type NavEntry = NavLink | NavGroup;

const pageContext = usePageContext();
const basePath = computed(() => `/${pageContext.routeParams.adminPath}`);
const { isMobile, openMobile, setOpenMobile, state } = useSidebar();
const { theme, setTheme } = useStorefrontPreferences();
const railCollapsed = computed(() => state.value === "collapsed" && !isMobile.value);

// Navigation is data-driven from lib/admin-navigation (unchanged); this only decides grouping and icons.
const sections: { label: string; entries: NavEntry[] }[] = [
  {
    label: "运营",
    entries: [
      { kind: "link", key: "dashboard", title: adminNavigation.dashboard.title, path: adminNavigation.dashboard.path, icon: LayoutDashboardIcon },
      { kind: "link", key: "orders", title: adminNavigation.orders.title, path: adminNavigation.orders.path, icon: ClipboardListIcon },
      { kind: "group", key: "product", title: adminNavigation.product.title, icon: PackageIcon, items: adminNavigation.product.items },
      { kind: "group", key: "suppliers", title: adminNavigation.suppliers.title, icon: KeyRoundIcon, items: adminNavigation.suppliers.items },
      { kind: "link", key: "users", title: adminNavigation.users.title, path: adminNavigation.users.path, icon: UsersIcon },
    ],
  },
  {
    label: "设置",
    entries: [
      { kind: "group", key: "push", title: adminNavigation.push.title, icon: BellIcon, items: adminNavigation.push.items },
      { kind: "group", key: "system", title: adminNavigation.system.title, icon: SettingsIcon, items: adminNavigation.system.items },
    ],
  },
];

const currentUser = computed(() => pageContext.user ?? null);
const currentUserName = computed(() => currentUser.value?.name?.trim() || currentUser.value?.email || "管理员");
const currentUserEmail = computed(() => currentUser.value?.email || "当前登录账号");
const userInitials = computed(() => currentUserName.value.slice(0, 2).toUpperCase());
// eslint-disable-next-line no-undef
const appVersion = __APP_VERSION__;
const updateStatus = ref("检查更新");
const lastCheckTime = ref(0);
const UPDATE_COOLDOWN_MS = 10 * 60 * 1000;

async function checkUpdate() {
  const now = Date.now();
  if (now - lastCheckTime.value < UPDATE_COOLDOWN_MS) {
    updateStatus.value = "请稍后";
    return;
  }

  lastCheckTime.value = now;
  updateStatus.value = "检查中...";
  try {
    const response = await fetch("https://raw.githubusercontent.com/mio-co/MioKey/main/package.json");
    const packageInfo = await response.json() as { version?: string };
    if (!response.ok || !packageInfo.version) throw new Error("invalid response");
    updateStatus.value = compareVersions(appVersion, packageInfo.version) >= 0 ? "已是最新" : `最新 v${packageInfo.version}`;
  } catch {
    updateStatus.value = "检查失败";
  }
}

function compareVersions(current: string, latest: string) {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);
  const length = Math.max(currentParts.length, latestParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;
    if (currentPart !== latestPart) return currentPart > latestPart ? 1 : -1;
  }
  return 0;
}

function isActive(path: string) {
  return isAdminNavigationItemActive(pageContext.urlPathname, basePath.value, { path } as unknown as AdminNavigationItem);
}

function isGroupActive(group: NavGroup) {
  return group.items.some((item) => isActive(item.path));
}

// Collapsible groups: remember what the user opened/closed, always reveal the group of the current page.
const NAV_STORAGE_KEY = "mk-admin-nav";
const openGroups = ref<Record<string, boolean>>({});
onMounted(() => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(NAV_STORAGE_KEY) || "{}") as Record<string, boolean>;
    if (saved && typeof saved === "object") openGroups.value = saved;
  } catch { /* ignore broken storage */ }
});
function isGroupOpen(group: NavGroup) {
  return openGroups.value[group.key] ?? isGroupActive(group);
}
function setGroupOpen(group: NavGroup, value: boolean) {
  openGroups.value = { ...openGroups.value, [group.key]: value };
  try { window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(openGroups.value)); } catch { /* storage full or disabled */ }
}
watch(() => pageContext.urlPathname, () => {
  for (const section of sections) for (const entry of section.entries) {
    if (entry.kind === "group" && isGroupActive(entry) && openGroups.value[entry.key] === false) setGroupOpen(entry, true);
  }
});

// Phone drawer (mail admin-sidebar pattern): back button closes it, tapping an item closes it and then navigates.
const { navigateFromDrawer } = useDrawerHistory(openMobile, setOpenMobile, isMobile);
function onNavClick(href: string, event: MouseEvent) {
  if (!isMobile.value || !openMobile.value) return;
  navigateFromDrawer(href, event);
}
// Safety net: any navigation (command menu, in-page links, history) closes the phone drawer.
watch(() => pageContext.urlPathname, () => {
  if (openMobile.value) setOpenMobile(false);
});

function toggleTheme() {
  setTheme(theme.value === "dark" ? "light" : "dark");
}

async function onSignOut() {
  await authClient.signOut();
  await navigate("/");
}
</script>
