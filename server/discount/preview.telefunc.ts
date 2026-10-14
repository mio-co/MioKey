import { telefuncAction } from "@/server/telefunc-action";
import { getContext } from "telefunc";
import { appError } from "@/lib/app-error";
import { enforceOrderRequestRateLimit } from "@/server/order/rate-limit";
import type { TelefuncContext } from "@/server/telefunc-context";
import { previewDiscount } from "./service";

async function internalOnPreviewDiscount(input: { productId: number; productSkuId: number; quantity: number; discountCode: string }) {
  const context = getContext<TelefuncContext>();
  if (!context.env?.DB) appError("DATABASE_UNAVAILABLE");
  await enforceOrderRequestRateLimit(context.env.DB, {
    action: "DISCOUNT",
    userId: context.user?.id ?? null,
    clientIp: context.clientIp,
  });
  return previewDiscount(context.env.DB, input);
}

export const onPreviewDiscount = telefuncAction(internalOnPreviewDiscount);
