import { reactive } from "vue";

/**
 * Promise-style confirmation dialog for the admin (MioCore pattern: one AlertDialog host in the layout,
 * pages call `await confirmAction({...})` instead of `window.confirm`). Pure UI state, no business logic.
 */
export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & { open: boolean; resolve: ((value: boolean) => void) | null };

export const confirmState = reactive<ConfirmState>({ open: false, title: "", resolve: null });

export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  const opts = typeof options === "string" ? { title: options } : options;
  // A second request while one is open resolves the first as cancelled.
  confirmState.resolve?.(false);
  return new Promise<boolean>((resolve) => {
    Object.assign(confirmState, { description: undefined, confirmText: undefined, cancelText: undefined, destructive: false }, opts, { open: true, resolve });
  });
}

export function settleConfirm(value: boolean) {
  const resolve = confirmState.resolve;
  confirmState.resolve = null;
  confirmState.open = false;
  resolve?.(value);
}
