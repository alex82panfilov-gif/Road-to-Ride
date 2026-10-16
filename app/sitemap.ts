import type { MetadataRoute } from "next";
import { catalog } from "@/lib/data";
import { tierAmounts } from "@/lib/tiers";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/cars", "/savings", "/guide", "/guide/glossary", "/quiz", "/method", "/changelog", "/privacy"];
  return [
    ...staticRoutes.map((path) => ({ url: `${base}${path || "/"}` })),
    ...catalog.map((item) => ({ url: `${base}/cars/${item.slug}` })),
    ...catalog.map((item) => ({ url: `${base}/cost/${item.slug}` })),
    ...catalog.map((item) => ({ url: `${base}/check/${item.slug}` })),
    ...tierAmounts().map((amount) => ({ url: `${base}/tiers/${amount}` })),
  ];
}
