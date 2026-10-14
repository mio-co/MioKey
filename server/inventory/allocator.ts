import { and, asc, eq, sql } from "drizzle-orm";
import { createDrizzleDb } from "@/database/drizzle";
import { card } from "@/database/drizzle/schema";
import { appError } from "@/lib/app-error";
import { reportUnexpectedServerError } from "@/server/error-handling";
import { isTransactionGuardFailure } from "@/server/transaction-guard";

export async function allocateCardsForPaidOrder(database: D1Database, orderId: number, quantity: number, productSkuId: number) {
  const db = createDrizzleDb(database);
  const count = Math.floor(quantity);
  if (!Number.isInteger(count) || count < 1) appError("CARD_QUANTITY_INVALID");

  // A delivery retry can follow a successful allocation whose snapshot write
  // did not complete. Reuse only cards already sold to this exact order.
  const existing = await db
    .select({ id: card.id, content: card.content })
    .from(card)
    .where(and(eq(card.orderId, orderId), eq(card.status, "SOLD")))
    .orderBy(asc(card.id));
  if (existing.length === count) return existing;
  if (existing.length > count) appError("CARD_DELIVERY_COUNT_MISMATCH");

  // Cards reserved for this order at creation/resume are sold first. Only an
  // order created before reservations existed takes unreserved stock here.
  const reserved = await db
    .select({ id: card.id })
    .from(card)
    .where(and(eq(card.orderId, orderId), eq(card.status, "RESERVED")))
    .orderBy(asc(card.id));
  if (existing.length + reserved.length > count) appError("CARD_DELIVERY_COUNT_MISMATCH");
  const missingCount = count - existing.length - reserved.length;

  const candidates = missingCount > 0
    ? await db
      .select({ id: card.id })
      .from(card)
      .where(and(eq(card.productSkuId, productSkuId), eq(card.status, "UNUSED")))
      .orderBy(asc(card.id))
      .limit(missingCount)
    : [];
  if (candidates.length < missingCount) appError("CARD_INVENTORY_SHORTAGE");

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  if (reserved.length) {
    statements.push(
      database.prepare("UPDATE card SET status = 'SOLD', soldAt = ?, updatedAt = ? WHERE orderId = ? AND status = 'RESERVED'").bind(now, now, orderId),
      database.prepare("INSERT INTO transactionGuard (id, value) VALUES (1, CASE WHEN changes() = ? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(reserved.length),
    );
  }
  if (candidates.length) {
    const candidateIds = candidates.map((item) => item.id);
    statements.push(
      database.prepare(`UPDATE card SET status = 'SOLD', orderId = ?, soldAt = ?, updatedAt = ? WHERE id IN (${candidateIds.map(() => "?").join(",")}) AND status = 'UNUSED'`).bind(orderId, now, now, ...candidateIds),
      database.prepare("INSERT INTO transactionGuard (id, value) VALUES (1, CASE WHEN changes() = ? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(missingCount),
    );
  }
  try {
    await database.batch(statements);
  } catch (cause) {
    if (isTransactionGuardFailure(cause)) appError("CARD_INVENTORY_SHORTAGE");
    reportUnexpectedServerError("inventory-allocate-cards", cause, { orderId, productSkuId });
    throw cause;
  }
  const allocated = await db.select({ id: card.id, content: card.content }).from(card).where(and(eq(card.orderId, orderId), eq(card.status, "SOLD"))).orderBy(asc(card.id));
  if (allocated.length !== count) appError("CARD_DELIVERY_COUNT_MISMATCH");
  return allocated;
}

// Reserves `quantity` unreserved cards of a SKU for a still-pending order in
// one statement, so concurrent writers can never reserve the same card.
// `orderIdSql` is either "?" (bound to an existing order id) or a subquery
// resolving the order inserted earlier in the same batch.
export function cardReservationStatements(database: D1Database, input: { orderIdSql: string; orderIdValue: number | string; productSkuId: number; quantity: number; now: number }) {
  return [
    database.prepare(`UPDATE card SET status = 'RESERVED', orderId = ${input.orderIdSql}, updatedAt = ?
      WHERE id IN (SELECT id FROM card WHERE productSkuId = ? AND status = 'UNUSED' ORDER BY id LIMIT ?)
        AND EXISTS (SELECT 1 FROM \`order\` WHERE id = ${input.orderIdSql} AND status = 'PENDING' AND paymentStatus = 'UNPAID')`)
      .bind(input.orderIdValue, input.now, input.productSkuId, input.quantity, input.orderIdValue),
    database.prepare("INSERT INTO transactionGuard (id, value) VALUES (1, CASE WHEN changes() = ? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(input.quantity),
  ];
}

// Tops up a pending order's reservation (orders created before reservations
// existed); throws PRODUCT_STOCK_NOT_ENOUGH when unreserved stock is short.
export async function ensureCardsReservedForPendingOrder(database: D1Database, orderId: number, productSkuId: number, quantity: number) {
  const db = createDrizzleDb(database);
  const [held] = await db.select({ count: sql<number>`count(*)` }).from(card).where(and(eq(card.orderId, orderId), eq(card.status, "RESERVED")));
  const missingCount = quantity - (held?.count ?? 0);
  if (missingCount <= 0) return;
  try {
    await database.batch(cardReservationStatements(database, { orderIdSql: "?", orderIdValue: orderId, productSkuId, quantity: missingCount, now: Date.now() }));
  } catch (cause) {
    if (isTransactionGuardFailure(cause)) appError("PRODUCT_STOCK_NOT_ENOUGH");
    reportUnexpectedServerError("inventory-reserve-cards", cause, { orderId, productSkuId });
    throw cause;
  }
}

export async function countAvailableCards(database: D1Database, productSkuId: number) {
  const db = createDrizzleDb(database);
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(card)
    .where(and(eq(card.productSkuId, productSkuId), eq(card.status, "UNUSED")));
  return result?.count ?? 0;
}
