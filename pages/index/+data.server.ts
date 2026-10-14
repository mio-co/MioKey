import { env } from "cloudflare:workers";
import { and, eq, inArray, min, count } from "drizzle-orm";
import { createDrizzleDb } from "@/database/drizzle";
import { productSku } from "@/database/drizzle/schema";
import { getPublicCatalog } from "@/server/catalog/public";
import { withServerDataErrorHandling } from "@/server/error-handling";
import { formatCentsAsYuan } from "@/lib/payment-utils";

export type Data = Awaited<ReturnType<typeof data>>;

/**
 * Storefront home data. Adds a read-only price range per product (lowest ACTIVE SKU price + SKU count)
 * so multi-variant cards can show "From ¥x" like the reference store. Catalog logic itself is unchanged.
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
    return {
      ...catalog,
      products: catalog.products.map((item) => {
        const range = rangeById.get(item.id);
        return { ...item, skuCount: range?.skuCount ?? 1, minPrice: range?.minPrice == null ? item.price : formatCentsAsYuan(range.minPrice) };
      }),
    };
  });
}
