import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURA AI - Intelligent Learning Pathways",
  description:
    "Unlock your potential with personalized, AI-driven learning roadmaps.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased bg-white text-zinc-900 min-h-screen selection:bg-purple-100 selection:text-purple-900">
        {children}
      </body>
    </html>
  );
}
