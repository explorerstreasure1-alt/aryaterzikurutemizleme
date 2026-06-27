import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arya Terzi Kuru Temizleme - Süper Kampanya Portalı",
  description:
    "Arya Terzi Kuru Temizleme kampanya portalı. Geri sayımlı süper fırsatlar, şans çarkı ve anlık indirim kodları.",
  keywords: [
    "kuru temizleme",
    "arya terzi",
    "kampanya",
    "indirim",
    "çark oyunu",
  ],
  openGraph: {
    title: "Arya Terzi Kuru Temizleme - Kampanya Portalı",
    description:
      "Kuru temizlemede süper fırsatlar! Geri sayım bitmeden kampanyaya katılın.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
      </head>
      <body className="bg-[#FEFCF5] text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
