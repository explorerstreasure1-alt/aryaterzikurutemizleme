import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0d9488",
};

const fontUrl =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&family=JetBrains+Mono:wght@400;700&display=swap";

export const metadata: Metadata = {
  title: {
    default: "Arya Terzi Kuru Temizleme - Süper Kampanya Portalı",
    template: "%s | Arya Terzi Kuru Temizleme",
  },
  description:
    "Arya Terzi Kuru Temizleme kampanya portalı. Geri sayımlı süper fırsatlar, şans çarkı ve anlık indirim kodları. Halı, yorgan, battaniye, perde, mont, kaban ve tüm hassas giysileriniz için profesyonel kuru temizleme.",
  keywords: [
    "kuru temizleme",
    "arya terzi",
    "kampanya",
    "indirim",
    "çark oyunu",
    "halı yıkama",
    "perde temizleme",
    "mont temizleme",
    "kaban temizleme",
    "ücretsiz teslimat",
  ],
  applicationName: "Arya Terzi Kampanya Portalı",
  authors: [{ name: "Arya Terzi Kuru Temizleme" }],
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  creator: "Arya Terzi",
  publisher: "Arya Terzi Kuru Temizleme",
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
    title: "Arya Terzi Kuru Temizleme - Süper Kampanya Portalı",
    description:
      "Kuru temizlemede süper fırsatlar! Geri sayım bitmeden kampanyaya katılın, şans çarkını çevirin ve anında indirim kodları kazanın.",
    type: "website",
    locale: "tr_TR",
    siteName: "Arya Terzi Kuru Temizleme",
    url: "https://arya-terzi.vercel.app",
    images: [
      {
        url: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&h=630&q=80",
        width: 1200,
        height: 630,
        alt: "Arya Terzi Kuru Temizleme - Süper Kampanya Portalı",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Terzi Kuru Temizleme - Süper Kampanya Portalı",
    description:
      "Kuru temizlemede süper fırsatlar! Geri sayım bitmeden kampanyaya katılın, şans çarkını çevirin ve anında indirim kodları kazanın.",
    images: [
      "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&h=630&q=80",
    ],
  },
  category: "business",
  classification: "Kuru Temizleme Hizmetleri",
  other: {
    "google-site-verification": "",
    "msapplication-TileColor": "#0d9488",
    "theme-color": "#0d9488",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontUrl} rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Arya Terzi" />
        <meta name="format-detection" content="telephone=yes" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* JSON-LD Structured Data for Local Business */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML in Next.js */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DryCleaningOrLaundry",
              name: "Arya Terzi Kuru Temizleme",
              description:
                "Profesyonel kuru temizleme, halı, yorgan, battaniye, perde, mont, kaban ve tüm hassas giysileriniz için kaliteli hizmet.",
              url: "https://arya-terzi.vercel.app",
              telephone: "+905551823776",
              address: {
                "@type": "PostalAddress",
                addressCountry: "TR",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                bestRating: "5",
                ratingCount: "127",
              },
              offers: [
                {
                  "@type": "Offer",
                  name: "Kuru Temizleme Kampanyaları",
                  description:
                    "Geri sayımlı süper fırsatlar, şans çarkı ve anlık indirim kodları.",
                },
              ],
            }),
          }}
        />
      </head>
      <body className="bg-[#FEFCF5] text-slate-900 antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
