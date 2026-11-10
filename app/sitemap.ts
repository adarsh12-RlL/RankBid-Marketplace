import { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://rankbid-marketplacelive.vercel.app");

export default function sitemap(): MetadataRoute.Sitemap {
  if (APP_URL.includes("localhost") || APP_URL.includes("127.0.0.1")) {
    return [];
  }

  const now = new Date();
  return [
    { url: `${APP_URL}/`,           lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${APP_URL}/categories`, lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${APP_URL}/companies`,  lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${APP_URL}/stats`,      lastModified: now, changeFrequency: "hourly",  priority: 0.8 },
    { url: `${APP_URL}/rules`,      lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/faq`,        lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${APP_URL}/about`,      lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${APP_URL}/terms`,      lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${APP_URL}/privacy`,    lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
