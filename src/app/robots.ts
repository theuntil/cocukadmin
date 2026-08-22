import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel/", "/yonetim/", "/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
