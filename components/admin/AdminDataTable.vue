<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import { computed, useSlots } from "vue"
import { useMediaQuery } from "@vueuse/core"
import { InboxIcon } from "@lucide/vue"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ContextMenu, ContextMenuContent, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"

export type AdminTableColumn<TRow extends Record<string, unknown> = Record<string, unknown>> = {
  key: string
  label: string
  class?: string
  headerClass?: string
  value?: (row: TRow) => unknown
}

const props = withDefaults(defineProps<{
  columns: AdminTableColumn<TRow>[]
  rows: TRow[]
  rowKey: keyof TRow | ((row: TRow) => string | number)
  showActions?: boolean
  emptyText?: string
  /** Shows skeleton rows while the first load is running, and a progress line on reloads. */
  loading?: boolean
  /** Phones: "stack" turns each row into a labelled card (default); "scroll" keeps the table and scrolls sideways. */
  mobile?: "stack" | "scroll"
  /** Right-click a row on desktop to get its actions in a context menu. */
  rowMenu?: boolean
}>(), {
  showActions: true,
  emptyText: "暂无数据.",
  loading: false,
  mobile: "stack",
  rowMenu: true,
})

const slots = useSlots()
const isPhone = useMediaQuery("(max-width: 767.98px)", { ssrWidth: 1024 })
const columnCount = computed(() => props.columns.length + (props.showActions ? 1 : 0))
const showSkeleton = computed(() => props.loading && !props.rows.length)
const menuEnabled = computed(() => props.rowMenu && props.showActions && Boolean(slots.actions) && !isPhone.value)

function keyFor(row: TRow) {
  return typeof props.rowKey === "function" ? props.rowKey(row) : String(row[props.rowKey])
}

function valueFor(row: TRow, column: AdminTableColumn<TRow>) {
  return column.value ? column.value(row) : row[column.key]
}

/** Actions inside the context menu are the page's own buttons; close the menu after one is used. */
function closeMenu(event: MouseEvent) {
  if (!(event.target as HTMLElement | null)?.closest("button, a")) return
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
}
</script>

<template>
  <div class="mk-table flex min-w-0 flex-col gap-4" :class="{ 'mk-table-stack': mobile === 'stack' }">
    <div v-if="$slots.toolbar" class="mk-table-toolbar flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <slot name="toolbar" />
    </div>

    <div class="mk-table-frame relative overflow-x-auto rounded-2xl border bg-card" :aria-busy="loading || undefined">
      <div v-if="loading && rows.length" class="mk-progress absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden" aria-hidden="true"><span /></div>
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead
              v-for="column in columns"
              :key="column.key"
              :class="column.headerClass"
            >
              {{ column.label }}
            </TableHead>
            <TableHead v-if="showActions" class="w-px text-right">
              <span class="sr-only">操作</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="showSkeleton">
            <TableRow v-for="index in 5" :key="`skeleton-${index}`" class="mk-skeleton-row hover:bg-transparent" data-testid="table-skeleton">
              <TableCell v-for="column in columns" :key="column.key" :data-label="column.label">
                <Skeleton class="h-4" :style="{ width: `${45 + ((index * 17 + column.key.length * 11) % 45)}%` }" />
              </TableCell>
              <TableCell v-if="showActions" class="mk-actions-cell"><Skeleton class="ml-auto h-7 w-16" /></TableCell>
            </TableRow>
          </template>
          <template v-else>
            <ContextMenu v-for="row in rows" :key="keyFor(row)">
              <ContextMenuTrigger as-child :disabled="!menuEnabled">
                <TableRow>
                  <TableCell v-for="column in columns" :key="column.key" :class="column.class" :data-label="column.label">
                    <slot :name="`cell-${column.key}`" :row="row" :value="valueFor(row, column)">
                      {{ valueFor(row, column) }}
                    </slot>
                  </TableCell>
                  <TableCell v-if="showActions" class="mk-actions-cell whitespace-nowrap text-right">
                    <slot name="actions" :row="row" />
                  </TableCell>
                </TableRow>
              </ContextMenuTrigger>
              <ContextMenuContent v-if="menuEnabled" class="mk-row-menu min-w-44">
                <ContextMenuLabel class="text-xs text-muted-foreground">操作</ContextMenuLabel>
                <ContextMenuSeparator />
                <div class="flex flex-col gap-0.5 p-0.5" @click="closeMenu">
                  <slot name="actions" :row="row" />
                </div>
              </ContextMenuContent>
            </ContextMenu>
          </template>
          <TableRow v-if="!rows.length && !showSkeleton" class="mk-empty-row hover:bg-transparent">
            <TableCell :colspan="columnCount" class="h-36 text-center text-muted-foreground">
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="flex size-10 items-center justify-center rounded-full bg-muted"><InboxIcon class="size-4" /></span>
                <span class="text-sm">{{ emptyText }}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="$slots.pagination" class="mk-table-pagination min-w-0 px-1 py-1">
      <slot name="pagination" />
    </div>
  </div>
</template>
