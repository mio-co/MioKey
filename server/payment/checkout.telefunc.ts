import { getContext } from "telefunc";
import { appError } from "@/lib/app-error";
import { enforceOrderRequestRateLimit } from "@/server/order/rate-limit";
import { telefuncAction } from "@/server/telefunc-action";
import type { TelefuncContext } from "@/server/telefunc-context";
import { requirePaymentFlowService } from "./flow-service";
import type { PaymentCreateInput } from "./types";

async function internalOnCreatePayment(input: PaymentCreateInput) {
  const context = getContext<TelefuncContext>();
  if (!context.env?.DB) appError("DATABASE_UNAVAILABLE");
  const userId = context.user?.id ?? null;
  // Telefunc's getContext() is unavailable on Workers once the telefunction yields,
  // so resolve the service (which reads the context) before rate limiting.
  const service = requirePaymentFlowService();
  await enforceOrderRequestRateLimit(context.env.DB, {
    action: "CREATE",
    userId,
    clientIp: context.clientIp,
  });
  return service.create(input, userId);
}

export const onCreatePayment = telefuncAction(internalOnCreatePayment);

export type { PaymentCreateInput };
