<script setup lang="ts">
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { confirmState, settleConfirm } from "@/lib/ui/admin-confirm";
import { TriangleAlertIcon } from "@lucide/vue";

function onOpenChange(value: boolean) {
  if (!value) settleConfirm(false);
}
</script>

<template>
  <AlertDialog :open="confirmState.open" @update:open="onOpenChange">
    <AlertDialogContent class="mk-confirm sm:max-w-md" data-testid="admin-confirm">
      <AlertDialogHeader class="flex-row items-start gap-3 text-left">
        <span v-if="confirmState.destructive" class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"><TriangleAlertIcon class="size-4" /></span>
        <div class="grid gap-1.5">
          <AlertDialogTitle>{{ confirmState.title }}</AlertDialogTitle>
          <AlertDialogDescription v-if="confirmState.description">{{ confirmState.description }}</AlertDialogDescription>
        </div>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ confirmState.cancelText || "取消" }}</AlertDialogCancel>
        <Button :variant="confirmState.destructive ? 'destructive' : 'default'" data-testid="admin-confirm-ok" @click="settleConfirm(true)">{{ confirmState.confirmText || "确认" }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
