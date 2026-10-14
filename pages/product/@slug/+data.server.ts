import { render } from "vike/abort";
import { env } from "cloudflare:workers";
import { getPublicCatalog, getPublicProductDetail, summarizeCategories } from "@/server/catalog/public";
import { getEnabledPaymentProviders } from "@/server/payment/config";
import { withServerDataErrorHandling } from "@/server/error-handling";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: { routeParams: { slug: string } }) {
  return withServerDataErrorHandling("page data: product", pageContext, async () => {
    // The three reads are independent: run them together instead of detail → (providers + catalog), which cost an
    // extra sequential D1 round trip on every product navigation. A missing product still renders the 404 page.
    const [product, paymentProviders, catalog] = await Promise.all([getPublicProductDetail(env.DB, pageContext.routeParams.slug), getEnabledPaymentProviders(env.DB), getPublicCatalog(env.DB)]);
    if (!product) throw render(404);
    // Header search on the product page: recommended products + category chips / dropdown (display only).
    const searchProducts = catalog.products.filter((item) => item.slug !== product.slug).slice(0, 12).map((item) => ({ id: item.id, name: item.name, slug: item.slug, subtitle: item.subtitle, coverImage: item.coverImage, price: item.price, categoryName: item.categoryName }));
    return { ...product, paymentProviders, searchProducts, searchCategories: summarizeCategories(catalog), searchProductTotal: catalog.products.length };
  });
}
