// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, expect, test } from "bun:test";
import { createDrizzleDb } from "../../database/drizzle";
import { category, productSku, productV2 } from "../../database/drizzle/schema";
import { getPublicCatalog, summarizeCategories } from "../../server/catalog/public";
import { createTestDatabase } from "../helpers/sqlite-d1";

describe("public catalog categories", () => {
  test("names products by their active category and counts products per category for navigation", async () => {
    const { database, close } = createTestDatabase();
    try {
      const db = createDrizzleDb(database);
      const now = new Date();
      const [games, tools, disabled, empty] = await db.insert(category).values([
        { name: "Games", slug: "games", sort: 1, createdAt: now, updatedAt: now },
        { name: "Tools", slug: "tools", sort: 2, createdAt: now, updatedAt: now },
        { name: "Hidden", slug: "hidden", sort: 3, status: "DISABLED", createdAt: now, updatedAt: now },
        { name: "Empty", slug: "empty", sort: 4, createdAt: now, updatedAt: now },
      ]).returning();
      const products = await db.insert(productV2).values([
        { name: "Game A", slug: "game-a", categoryId: games!.id, status: "ACTIVE", createdAt: now, updatedAt: now },
        { name: "Game B", slug: "game-b", categoryId: games!.id, status: "ACTIVE", createdAt: now, updatedAt: now },
        { name: "Tool A", slug: "tool-a", categoryId: tools!.id, status: "ACTIVE", createdAt: now, updatedAt: now },
        { name: "Hidden A", slug: "hidden-a", categoryId: disabled!.id, status: "ACTIVE", createdAt: now, updatedAt: now },
        { name: "Draft", slug: "draft", categoryId: tools!.id, status: "DRAFT", createdAt: now, updatedAt: now },
      ]).returning();
      for (const product of products) {
        await db.insert(productSku).values({ productId: product.id, name: "Default", price: 1000, fulfillmentSource: "LOCAL", deliveryType: "MANUAL", status: "ACTIVE", physicalStock: 3, minBuy: 1, maxBuy: 5, createdAt: now, updatedAt: now });
      }

      const catalog = await getPublicCatalog(database);
      expect(catalog.products.map((item) => [item.slug, item.categoryName])).toEqual([["game-a", "Games"], ["game-b", "Games"], ["tool-a", "Tools"]]);
      // Only active categories that hold a listed product are offered.
      expect(catalog.categories.map((item) => item.slug)).toEqual(["games", "tools"]);
      expect(summarizeCategories(catalog)).toEqual([{ id: games!.id, name: "Games", count: 2 }, { id: tools!.id, name: "Tools", count: 1 }]);
      expect(empty).toBeDefined();
    } finally {
      close();
    }
  });
});
