import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import TopTabs from "@/components/BottomNav";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bloom",
  description: "Your intelligent cycle companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="min-h-full flex flex-col max-w-md mx-auto relative">
        <TopTabs />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
