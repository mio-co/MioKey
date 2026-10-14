import type { Hono } from "hono";
import { getPublicCatalog } from "@/server/catalog/public";
import { getSiteSettings } from "@/server/site/public-settings";

/**
 * Read-only /sitemap.xml (added in the MioKey rework, Cycle 2). Lists only what the public
 * storefront already shows: the home page, each category filter view and every active product,
 * using the same public catalog query as the home page. No writes, no new data.
 */
function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function siteOrigin(configured: string | null | undefined, requestUrl: string) {
  try {
    if (configured) {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    }
  } catch { /* fall back to the request origin */ }
  return new URL(requestUrl).origin;
}

export function buildSitemapXml(origin: string, catalog: { categories: { id: number }[]; products: { slug: string; coverImage?: string | null; name: string }[] }) {
  const entries: string[] = [`  <url><loc>${escapeXml(`${origin}/`)}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`];
  for (const item of catalog.categories) entries.push(`  <url><loc>${escapeXml(`${origin}/?category=${item.id}`)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`);
  for (const item of catalog.products) {
    const image = item.coverImage ? (() => { try { return new URL(item.coverImage, `${origin}/`).toString(); } catch { return null; } })() : null;
    entries.push(`  <url><loc>${escapeXml(`${origin}/product/${encodeURIComponent(item.slug)}`)}</loc><changefreq>weekly</changefreq><priority>0.8</priority>${image ? `<image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(item.name)}</image:title></image:image>` : ""}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join("\n")}\n</urlset>\n`;
}

export function registerSeoRoutes(app: Hono<{ Bindings: Record<string, unknown> & { DB: D1Database } }>) {
  app.get("/sitemap.xml", async (context) => {
    const [settings, catalog] = await Promise.all([getSiteSettings(context.env.DB), getPublicCatalog(context.env.DB)]);
    const xml = buildSitemapXml(siteOrigin(settings.siteUrl, context.req.url), catalog);
    return context.body(xml, 200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" });
  });
}
