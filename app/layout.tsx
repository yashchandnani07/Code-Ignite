import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

let title = "Code Ignite – AI Code Generator by Yash Chandnani";
let description = "Generate your next app with Code Ignite";
let url = "https://code-ignite-eta.vercel.app/";
let ogimage = "https://code-ignite-eta.vercel.app/og-image.png";
let sitename = "code-ignite-eta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Plausible Analytics using Next.js Script */}
        <script defer data-domain="code-ignite-eta.vercel.app" src="https://plausible.io/js/script.js"></script>
      </head>
      <body className="flex min-h-full flex-col bg-gray-100 text-gray-900 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
