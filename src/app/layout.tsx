import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "My Pack. Your Brand. — mypack.lol",
  description:
    "I'm a walking billboard. Your logo walks the city with me every single day. Eight spots on my backpack, open to the highest bidder.",
  openGraph: {
    title: "My Pack. Your Brand.",
    description: "Your logo walks the city with me every single day.",
    url: siteUrl(),
    siteName: "mypack.lol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Pack. Your Brand.",
    description: "Your logo walks the city with me every single day.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="grain font-sans antialiased">{children}</body>
    </html>
  );
}
