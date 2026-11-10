import PaymentMonitor from "@/components/PaymentMonitor";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import MemberPresenceTracker from "@/components/MemberPresenceTracker";
import SupportAssistant from "@/components/SupportAssistant";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://rankbid-marketplacelive.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "RankBid — Discover products. Choose your placement.",
    template: "%s | RankBid",
  },
  description:
    "A transparent paid-product leaderboard. Positions follow verified payments; traffic and sales are not guaranteed.",
  alternates: {
    canonical: "./",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "RankBid",
    title: "RankBid — Discover products. Choose your placement.",
    description:
      "A transparent paid-product leaderboard. Positions follow verified payments; traffic and sales are not guaranteed.",
    url: APP_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RankBid Marketplace Leaderboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RankBid — Discover products. Choose your placement.",
    description:
      "A transparent paid-product leaderboard. Positions follow verified payments; traffic and sales are not guaranteed.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03060f",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: APP_URL,
      name: "RankBid",
      description: "A transparent paid-product leaderboard.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${APP_URL}/categories?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${APP_URL}/#organization`,
      name: "RankBid",
      url: APP_URL,
      logo: `${APP_URL}/icon.svg`,
      sameAs: [
        "https://rankbid-official.vercel.app",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans rankbid-body">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsTracker /><MemberPresenceTracker /><PaymentMonitor />{children}<SupportAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}
