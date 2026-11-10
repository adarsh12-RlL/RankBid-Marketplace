import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://rankbid-marketplacelive.vercel.app");

  const isLocal = siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1");

  if (isLocal) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/rules",
          "/faq",
          "/categories",
          "/categories/*",
          "/companies",
          "/companies/*",
          "/stats",
          "/top10",
          "/product/*",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/admin/",
          "/admin",
          "/owner",
          "/dashboard/",
          "/messages",
          "/api/",
          "/checkout/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
