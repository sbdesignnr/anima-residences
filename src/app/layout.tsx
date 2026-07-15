import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

/**
 * The hero logotype only. Cinzel is engraved Roman capitals — the Trajan-lineage
 * face the reference logo is drawn in — and it gives ANIMA the weight and
 * presence a delicate Garamond cannot. Scoped to the wordmark; the rest of the
 * site stays on Cormorant.
 */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anima Residences — Refined Living. Inspired by Soul.",
  description:
    "Anima Residences — prémiový bytový projekt v Nitre. Refined living, inspired by soul.",
};

export const viewport: Viewport = {
  themeColor: "#1c1c1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior="smooth"` tells Next.js 16 to force instant
    // scrolling during navigation, so the CSS smooth-scroll below only ever
    // applies to in-page anchors.
    <html
      lang="sk"
      className={`${cormorant.variable} ${dmSans.variable} ${cinzel.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-charcoal text-stone antialiased">{children}</body>
    </html>
  );
}
