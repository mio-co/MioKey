import { render } from "vike/abort";
import { env } from "cloudflare:workers";
import { getPublicCatalog, getPublicProductDetail } from "@/server/catalog/public";
import { getEnabledPaymentProviders } from "@/server/payment/config";
import { withServerDataErrorHandling } from "@/server/error-handling";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: { routeParams: { slug: string } }) {
  return withServerDataErrorHandling("page data: product", pageContext, async () => {
    const product = await getPublicProductDetail(env.DB, pageContext.routeParams.slug);
    if (!product) throw render(404);
    const [paymentProviders, catalog] = await Promise.all([getEnabledPaymentProviders(env.DB), getPublicCatalog(env.DB)]);
    // Header search on the product page: recommended products + category chips (display only).
    const searchProducts = catalog.products.filter((item) => item.slug !== product.slug).slice(0, 12).map((item) => ({ id: item.id, name: item.name, slug: item.slug, subtitle: item.subtitle, coverImage: item.coverImage, price: item.price, categoryName: item.categoryName }));
    return { ...product, paymentProviders, searchProducts, searchCategories: catalog.categories };
  });
}
