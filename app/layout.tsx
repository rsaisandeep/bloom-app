import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import NavWrapper from "@/components/NavWrapper";

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
        <AuthGuard>
          <NavWrapper />
          <main className="flex-1" style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
