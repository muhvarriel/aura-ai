import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// Menggunakan font Outfit untuk tampilan yang modern dan clean
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap", // Mencegah FOIT (Flash of Invisible Text)
});

export const metadata: Metadata = {
  title: "SkillForge AI - Interactive Learning Roadmaps",
  description: "Generate personalized learning paths and quizzes instantly with AI.",
  icons: {
    icon: "/favicon.ico", // Pastikan favicon ada atau hapus baris ini jika belum ada
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased bg-white text-zinc-900 min-h-screen selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
