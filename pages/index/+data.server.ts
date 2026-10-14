import { env } from "cloudflare:workers";
import { and, eq, inArray, min, count, sql } from "drizzle-orm";
import { createDrizzleDb } from "@/database/drizzle";
import { card, productSku } from "@/database/drizzle/schema";
import { getPublicCatalog } from "@/server/catalog/public";
import { withServerDataErrorHandling } from "@/server/error-handling";
import { formatCentsAsYuan } from "@/lib/payment-utils";

export type Data = Awaited<ReturnType<typeof data>>;

/**
 * Storefront home data. Adds a read-only price range per product (lowest ACTIVE SKU price + SKU count)
 * so multi-variant cards can show "From ¥x" like the reference store. Catalog logic itself is unchanged.
 * Cycle 4: also a read-only aggregate stock across ACTIVE SKUs (card stock = UNUSED cards, physical = physicalStock,
 * supplier = unlimited/null), so a product is only "sold out" when every variant is, not when the first one is.
 */
export async function data() {
  return withServerDataErrorHandling("page data: index", {}, async () => {
    const catalog = await getPublicCatalog(env.DB);
    const ids = catalog.products.map((item) => item.id);
    const ranges = ids.length
      ? await createDrizzleDb(env.DB)
          .select({ productId: productSku.productId, minPrice: min(productSku.price), skuCount: count() })
          .from(productSku)
          .where(and(inArray(productSku.productId, ids), eq(productSku.status, "ACTIVE")))
          .groupBy(productSku.productId)
      : [];
    const rangeById = new Map(ranges.map((item) => [item.productId, item]));
    const db = createDrizzleDb(env.DB);
    const skus = ids.length
      ? await db.select({ id: productSku.id, productId: productSku.productId, deliveryType: productSku.deliveryType, physicalStock: productSku.physicalStock })
          .from(productSku)
          .where(and(inArray(productSku.productId, ids), eq(productSku.status, "ACTIVE")))
      : [];
    const cardSkuIds = skus.filter((sku) => sku.deliveryType === "CARD_AUTO").map((sku) => sku.id);
    const cardRows = cardSkuIds.length
      ? await db.select({ skuId: card.productSkuId, n: sql<number>`count(*)` }).from(card).where(and(inArray(card.productSkuId, cardSkuIds), eq(card.status, "UNUSED"))).groupBy(card.productSkuId)
      : [];
    const cardsBySku = new Map(cardRows.map((row) => [row.skuId, Number(row.n)]));
    const stockById = new Map<number, number | null>();
    for (const sku of skus) {
      const stock = sku.deliveryType === "CARD_AUTO" ? cardsBySku.get(sku.id) ?? 0 : sku.deliveryType === "SUPPLIER" ? null : sku.physicalStock;
      const prev = stockById.has(sku.productId) ? stockById.get(sku.productId)! : 0;
      stockById.set(sku.productId, prev === null || stock === null ? null : prev + stock);
    }
    return {
      ...catalog,
      products: catalog.products.map((item) => {
        const range = rangeById.get(item.id);
        return {
          ...item,
          skuCount: range?.skuCount ?? 1,
          minPrice: range?.minPrice == null ? item.price : formatCentsAsYuan(range.minPrice),
          availableStock: stockById.has(item.id) ? stockById.get(item.id)! : item.availableStock,
        };
      }),
    };
  });
}
