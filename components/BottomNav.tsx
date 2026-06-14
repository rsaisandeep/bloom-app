"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",         label: "Home",     icon: "🏠" },
  { href: "/log",      label: "Log",      icon: "✏️" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/insights", label: "Insights", icon: "✨" },
];

export default function TopTabs() {
  const path = usePathname();
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 60,
      background: "rgba(238,232,245,0.78)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,255,255,0.6)",
      boxShadow: "0 4px 24px rgba(110,52,130,0.08)",
      maxWidth: "448px", width: "100%", margin: "0 auto",
    }}>
      <div style={{ display: "flex", padding: "10px 12px 8px" }}>
        {tabs.map((tab) => {
          const active = path === tab.href;
          return (
            <Link key={tab.href} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, padding: "6px 4px",
              textDecoration: "none", position: "relative",
              color: active ? "#6E3482" : "#8A6A9A",
              transition: "color .2s cubic-bezier(.22,.61,.36,1)",
            }}>
              <span style={{
                fontSize: "1.2rem", lineHeight: 1,
                filter: active ? "drop-shadow(0 2px 6px rgba(110,52,130,0.4))" : "none",
                transition: "filter .2s",
              }}>{tab.icon}</span>
              <span style={{
                fontSize: ".6rem", fontWeight: active ? 800 : 600,
                letterSpacing: ".2px",
              }}>{tab.label}</span>
              {active && (
                <div style={{
                  position: "absolute", bottom: -8, left: "50%",
                  transform: "translateX(-50%)",
                  width: 20, height: 3, borderRadius: 999,
                  background: "linear-gradient(135deg,#6E3482,#A56ABD)",
                  boxShadow: "0 2px 6px rgba(110,52,130,0.4)",
                }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
