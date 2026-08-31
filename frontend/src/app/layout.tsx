import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "SkyLens-AI 🌤️ Real-Time 4-Class Weather & Sky Detective",
  description:
    "Real-time deep learning sky and weather recognition powered by MobileNetV2 and TensorFlow Lite with >98% accuracy. Classify Cloudy, Rain, Shine, and Sunrise instantly with personalized outdoor advisories.",
  keywords: [
    "SkyLens",
    "Weather AI",
    "Cloud Classifier",
    "Computer Vision",
    "TensorFlow Lite",
    "MobileNetV2",
    "Meteorology",
    "Next.js"
  ],
  authors: [{ name: "Aradhya Ray", url: "https://github.com/AradhyaRay05" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  openGraph: {
    title: "SkyLens-AI 🌤️ Real-Time 4-Class Weather & Sky Detective",
    description:
      "Snap or upload any sky photo to get instant weather classification, outfit suggestions, and UV/outdoor advice.",
    siteName: "SkyLens-AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SkyLens-AI 🌤️ Real-Time 4-Class Weather Classifier",
    description: "Instant AI atmospheric condition analyzer and outdoor advisory detective.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
