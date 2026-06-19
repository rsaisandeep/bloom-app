import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import NavWrapper from "@/components/NavWrapper";
import InstallPrompt from "@/components/InstallPrompt";
import PullToRefresh from "@/components/PullToRefresh";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bloom",
  description: "Your intelligent cycle companion",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bloom" },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#EEE8F5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="min-h-full flex flex-col max-w-md mx-auto relative">
        <AuthGuard>
          <NavWrapper />
          <PullToRefresh>
            <main className="flex-1" style={{ paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>{children}</main>
          </PullToRefresh>
          <InstallPrompt />
        </AuthGuard>
      </body>
    </html>
  );
}
