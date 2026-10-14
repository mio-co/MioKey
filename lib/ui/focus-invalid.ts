import { nextTick } from "vue";

/**
 * After a failed client-side validation, move focus to the first field marked invalid
 * (vee-validate sets aria-invalid on our inputs). Screen readers then announce the field
 * and its error instead of the user hunting for what went wrong. Pure UI, no form logic.
 */
export async function focusFirstInvalid(root?: Element | Document | null) {
  await nextTick();
  if (typeof document === "undefined") return;
  const scope = root ?? document;
  const field = scope.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled]), [data-invalid="true"] input:not([disabled]), [data-invalid="true"] textarea, [data-invalid="true"] button[role="combobox"]');
  if (!field) return;
  field.focus({ preventScroll: true });
  field.scrollIntoView({ block: "center", behavior: "smooth" });
}
