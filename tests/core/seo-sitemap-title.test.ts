// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, expect, test } from "bun:test";
import { buildRobotsTxt, buildSitemapXml } from "../../server/seo/sitemap";
import { storefrontPageTitle } from "../../lib/seo/page-title";

describe("sitemap.xml", () => {
  test("lists home, category views and products with escaped absolute URLs", () => {
    const xml = buildSitemapXml("https://shop.example", {
      categories: [{ id: 3 }],
      products: [{ slug: "steam", name: "Steam & 钱包", coverImage: "/demo/steam.png" }, { slug: "vpn", name: "VPN", coverImage: null }],
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<loc>https://shop.example/</loc>");
    expect(xml).toContain("<loc>https://shop.example/?category=3</loc>");
    expect(xml).toContain("<loc>https://shop.example/product/steam</loc>");
    expect(xml).toContain("<image:loc>https://shop.example/demo/steam.png</image:loc>");
    expect(xml).toContain("<image:title>Steam &amp; 钱包</image:title>");
    expect(xml).toContain("<loc>https://shop.example/product/vpn</loc>");
    expect(xml.match(/<url>/g)?.length).toBe(4);
  });
});

describe("storefront page titles", () => {
  test("home uses name + subtitle, inner pages are labelled, unknown paths fall back to the name", () => {
    expect(storefrontPageTitle("/", { name: "店", subtitle: "副标题" })).toBe("店 - 副标题");
    expect(storefrontPageTitle("/login", { name: "店" })).toBe("登录 · 店");
    expect(storefrontPageTitle("/account/order/", { name: "店" })).toBe("我的订单 · 店");
    expect(storefrontPageTitle("/whatever", null)).toBe("MioKey");
  });
});

describe("buildRobotsTxt", () => {
  test("keeps the private-path rules and points at the absolute sitemap", () => {
    const txt = buildRobotsTxt("https://shop.example.com");
    expect(txt).toContain("Disallow: /checkout");
    expect(txt).toContain("Disallow: /api/");
    expect(txt.trim().endsWith("Sitemap: https://shop.example.com/sitemap.xml")).toBe(true);
  });
});
