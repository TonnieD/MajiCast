import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MajiCast — Water Quality Monitoring for Kenya",
    template: "%s | MajiCast",
  },
  description:
    "MajiCast is an ML-powered water quality monitoring and contamination risk prediction system for Kenya. Explore water point data, NLP-based safety classification, and real-time risk maps.",
  keywords: ["water quality", "Kenya", "machine learning", "contamination risk", "water monitoring", "WPDx"],
  authors: [{ name: "Anthony Nganga Chege" }],
  openGraph: {
    title: "MajiCast — Water Quality Monitoring",
    description: "ML-powered water quality monitoring and contamination risk prediction for Kenya.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="bg-parchment font-sans text-forest-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-64 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
