import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://mypack.lol"),
  title: "My Pack. Your Brand. — mypack.lol",
  description:
    "Soy un walking billboard. Tu logo camina conmigo todos los días por la ciudad. Subasta abierta por 6 zonas de mi mochila.",
  openGraph: {
    title: "My Pack. Your Brand.",
    description: "Tu logo camina conmigo todos los días por la ciudad.",
    url: "https://mypack.lol",
    siteName: "mypack.lol",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Pack. Your Brand.",
    description: "Tu logo camina conmigo todos los días por la ciudad.",
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
    <html lang="es" className={`${inter.variable} ${display.variable}`}>
      <body className="grain font-sans antialiased">{children}</body>
    </html>
  );
}
