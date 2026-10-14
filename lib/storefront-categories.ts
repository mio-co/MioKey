import { computed, inject, ref, shallowRef, type InjectionKey, type Ref } from "vue";

/** A category as the storefront header shows it; `count` is the number of listed products (when known). */
export type NavCategory = { id: number; name: string; count?: number };

/**
 * The home page provides this so header / menu category links filter the already-loaded catalogue in place
 * (no pageContext round trip). On every other page it is absent and links navigate to `/?category=<id>`.
 */
export type HomeCategoryFilter = { selected: Ref<number | null>; select: (id: number | null) => void };
export const HOME_CATEGORY_FILTER_KEY: InjectionKey<HomeCategoryFilter> = Symbol("mk-home-category-filter");

export function useHomeCategoryFilter() {
  return inject(HOME_CATEGORY_FILTER_KEY, null);
}

export function categoryHref(id: number | null) {
  return id === null ? "/" : `/?category=${id}`;
}

// Pages whose data does not carry the catalogue (order lookup, account, checkout…) load the list once per tab, on first intent.
const fetched = shallowRef<{ total: number; categories: NavCategory[] } | null>(null);
let pending: Promise<void> | null = null;

function loadCategories() {
  if (fetched.value || pending || typeof window === "undefined") return pending ?? Promise.resolve();
  pending = fetch("/api/catalog/categories", { headers: { accept: "application/json" } })
    .then((response) => (response.ok ? (response.json() as Promise<{ total?: unknown; categories?: unknown }>) : Promise.reject(new Error(String(response.status)))))
    .then((body) => {
      const categories = Array.isArray(body.categories)
        ? body.categories.filter((item): item is NavCategory => !!item && typeof item.id === "number" && typeof item.name === "string")
        : [];
      fetched.value = { total: typeof body.total === "number" ? body.total : categories.reduce((sum, item) => sum + (item.count ?? 0), 0), categories };
    })
    .catch(() => undefined)
    .finally(() => { pending = null; });
  return pending;
}

/**
 * Categories for the header dropdown and the menu drawer: the page's own list when it has one (home, product),
 * otherwise the lazily fetched one. `ensure()` starts that fetch (hover / focus / opening the menu).
 */
export function useNavCategories(source: () => NavCategory[], total: () => number | null) {
  const loading = ref(false);
  const local = computed(() => source());
  const categories = computed(() => (local.value.length ? local.value : fetched.value?.categories ?? []));
  const totalCount = computed(() => (local.value.length ? total() : fetched.value?.total ?? null));
  async function ensure() {
    if (local.value.length || fetched.value) return;
    loading.value = true;
    await loadCategories();
    loading.value = false;
  }
  return { categories, totalCount, loading, ensure };
}
