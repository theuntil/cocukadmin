import type { MetadataRoute } from "next";
import { getNewsSlugs, getEventSlugs, getTeamSlugs } from "@/lib/data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cocuktribunu.org";

const STATIC_PATHS = [
  "", "/hakkimizda", "/imza-kampanyasi", "/kombine-kart", "/etkinlikler", "/takimlar",
  "/blog", "/duyurular", "/iletisim", "/sss", "/gonullu-ol", "/basin",
  "/kvkk", "/gizlilik", "/cerez-politikasi", "/uyelik-kosullari",
  "/cocuk-verileri-politikasi", "/mesafeli-satis", "/iptal-iade",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [newsSlugs, eventSlugs, teamSlugs] = await Promise.all([
    getNewsSlugs(200), getEventSlugs(200), getTeamSlugs(),
  ]);

  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${SITE}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...newsSlugs.map((slug) => ({
      url: `${SITE}/blog/${slug}`,
      lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6,
    })),
    ...eventSlugs.map((slug) => ({
      url: `${SITE}/etkinlikler/${slug}`,
      lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.6,
    })),
    ...teamSlugs.map((slug) => ({
      url: `${SITE}/takimlar/${slug}`,
      lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5,
    })),
  ];
}
