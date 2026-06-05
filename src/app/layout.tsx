import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://helixhealth.vercel.app";
const OG_TITLE = "Helix Health: Every app shows you what. Helix shows you why.";
const OG_DESCRIPTION =
  "An AI health intelligence layer that connects your signals, uncovers what's driving your health, and suggests the next best step.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Helix Health",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Helix Health: Every app shows you what. Helix shows you why.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}
