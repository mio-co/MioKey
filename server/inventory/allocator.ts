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
  // Any reservation beyond the quantity is released in the same batch.
  const reserved = await db
    .select({ id: card.id })
    .from(card)
    .where(and(eq(card.orderId, orderId), eq(card.status, "RESERVED")))
    .orderBy(asc(card.id));
  const sellCount = Math.min(reserved.length, count - existing.length);
  const missingCount = count - existing.length - sellCount;

  if (missingCount > 0) {
    const [available] = await db
      .select({ n: sql<number>`count(*)` })
      .from(card)
      .where(and(eq(card.productSkuId, productSkuId), eq(card.status, "UNUSED")));
    if (Number(available?.n ?? 0) < missingCount) appError("CARD_INVENTORY_SHORTAGE");
  }

  // Every statement binds a constant number of parameters (D1 caps a
  // statement at 100), whatever the order quantity.
  const now = Date.now();
  const guard = (expected: number) => database.prepare("INSERT INTO transactionGuard (id, value) VALUES (1, CASE WHEN changes() = ? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(expected);
  const statements: D1PreparedStatement[] = [];
  if (sellCount > 0) {
    statements.push(
      database.prepare("UPDATE card SET status = 'SOLD', soldAt = ?, updatedAt = ? WHERE id IN (SELECT id FROM card WHERE orderId = ? AND status = 'RESERVED' ORDER BY id LIMIT ?)").bind(now, now, orderId, sellCount),
      guard(sellCount),
    );
  }
  if (reserved.length > sellCount) {
    // Release any reservation beyond the quantity, after the sell above.
    statements.push(database.prepare("UPDATE card SET status = 'UNUSED', orderId = NULL, updatedAt = ? WHERE orderId = ? AND status = 'RESERVED'").bind(now, orderId));
  }
  if (missingCount > 0) {
    statements.push(
      database.prepare("UPDATE card SET status = 'SOLD', orderId = ?, soldAt = ?, updatedAt = ? WHERE id IN (SELECT id FROM card WHERE productSkuId = ? AND status = 'UNUSED' ORDER BY id LIMIT ?)").bind(orderId, now, now, productSkuId, missingCount),
      guard(missingCount),
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

export type CardReservationOrder = { orderId: number } | { orderNo: string };

// Reserves `quantity` unreserved cards of a SKU for a still-pending order in
// one statement, so concurrent writers can never reserve the same card. The
// UPDATE also requires the order to currently hold exactly `held` reserved
// cards, so a concurrent top-up that already reserved fails the guard instead
// of reserving twice. `{ orderNo }` resolves an order inserted earlier in the
// same batch.
export function cardReservationStatements(database: D1Database, input: { order: CardReservationOrder; held: number; productSkuId: number; quantity: number; now: number }) {
  const [orderIdSql, orderIdValue] = "orderId" in input.order
    ? ["?", input.order.orderId] as const
    : ["(SELECT id FROM `order` WHERE orderNo = ?)", input.order.orderNo] as const;
  return [
    database.prepare(`UPDATE card SET status = 'RESERVED', orderId = ${orderIdSql}, updatedAt = ?
      WHERE id IN (SELECT id FROM card WHERE productSkuId = ? AND status = 'UNUSED' ORDER BY id LIMIT ?)
        AND EXISTS (SELECT 1 FROM \`order\` WHERE id = ${orderIdSql} AND status = 'PENDING' AND paymentStatus = 'UNPAID')
        AND (SELECT count(*) FROM card WHERE orderId = ${orderIdSql} AND status = 'RESERVED') = ?`)
      .bind(orderIdValue, input.now, input.productSkuId, input.quantity, orderIdValue, orderIdValue, input.held),
    database.prepare("INSERT INTO transactionGuard (id, value) VALUES (1, CASE WHEN changes() = ? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET value = excluded.value").bind(input.quantity),
  ];
}

async function countReservedCards(database: D1Database, orderId: number) {
  const db = createDrizzleDb(database);
  const [held] = await db.select({ count: sql<number>`count(*)` }).from(card).where(and(eq(card.orderId, orderId), eq(card.status, "RESERVED")));
  return held?.count ?? 0;
}

// Tops up a pending order's reservation (orders created before reservations
// existed); throws PRODUCT_STOCK_NOT_ENOUGH when unreserved stock is short.
export async function ensureCardsReservedForPendingOrder(database: D1Database, orderId: number, productSkuId: number, quantity: number) {
  const held = await countReservedCards(database, orderId);
  const missingCount = quantity - held;
  if (missingCount <= 0) return;
  try {
    await database.batch(cardReservationStatements(database, { order: { orderId }, held, productSkuId, quantity: missingCount, now: Date.now() }));
  } catch (cause) {
    if (isTransactionGuardFailure(cause)) {
      // A concurrent resume may have reserved first; that is success.
      if ((await countReservedCards(database, orderId)) >= quantity) return;
      appError("PRODUCT_STOCK_NOT_ENOUGH");
    }
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
