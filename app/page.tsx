"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadData, getCurrentPhase, getPredictions, PHASE_META, type BloomData } from "@/lib/cycle";

const PHASE_ACCENT: Record<string, string> = {
  menstrual:  "rgba(249,168,212,0.85)",
  follicular: "rgba(196,181,253,0.85)",
  ovulation:  "rgba(253,230,138,0.85)",
  luteal:     "rgba(165,180,252,0.85)",
};

const CARD_EASE = "cubic-bezier(.22,.61,.36,1)";

export default function Home() {
  const [data, setData] = useState<BloomData>({ cycles: [], logs: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setData(loadData()); setMounted(true); }, []);

  const { phase, dayOfCycle } = getCurrentPhase(data.cycles);
  const meta = PHASE_META[phase];
  const predictions = getPredictions(data.cycles);
  const avgLen = predictions?.avgLength ?? 28;
  const progress = Math.min(360, Math.round((dayOfCycle / avgLen) * 360));
  const phaseAccent = PHASE_ACCENT[phase];
  const todayLog = data.logs.find((l) => l.date === new Date().toISOString().split("T")[0]);

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d;
  });

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 8px" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600, color: "#8A6A9A", letterSpacing: ".3px" }}>
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "1.75rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: "-.02em" }}>
            Hello 👋
          </h1>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #6E3482, #49225B)",
          boxShadow: "0 4px 16px rgba(110,52,130,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: ".9rem",
        }}>B</div>
      </div>

      {/* Week strip — glass card */}
      <div style={{ margin: "0 16px 16px" }}>
        <div className="glass-card" style={{ padding: "12px 14px", borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const hasLog = data.logs.some((l) => l.date === d.toISOString().split("T")[0]);
              const dayNames = ["S","M","T","W","T","F","S"];
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: ".65rem", fontWeight: 700, color: "#8A6A9A", letterSpacing: ".2px" }}>
                    {dayNames[d.getDay()]}
                  </span>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: isToday ? "linear-gradient(135deg,#6E3482,#49225B)" : "transparent",
                    color: isToday ? "#fff" : "#1C0B2E",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: ".82rem", fontWeight: 800,
                    boxShadow: isToday ? "0 4px 12px rgba(110,52,130,0.4), inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
                    transition: `all .2s ${CARD_EASE}`,
                  }}>{d.getDate()}</div>
                  {hasLog && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#A56ABD" }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Circular day indicator */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "8px 0 20px" }}>
        <div style={{ position: "relative", width: 210, height: 210 }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(165,106,189,0.18)" strokeWidth="13" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={phaseAccent}
              strokeWidth="13" strokeDasharray={`${(progress/360)*553} 553`} strokeLinecap="round" />
          </svg>
          <div style={{
            position: "absolute", inset: 16, borderRadius: "50%",
            background: "var(--glass)", backdropFilter: "var(--blur)", WebkitBackdropFilter: "var(--blur)",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 8px 32px rgba(110,52,130,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "3.2rem", fontWeight: 800, lineHeight: 1, color: "#1C0B2E", letterSpacing: "-2px" }}>
              {dayOfCycle}
            </span>
            <span style={{ fontSize: ".68rem", fontWeight: 600, color: "#8A6A9A", marginTop: 2, letterSpacing: ".3px" }}>DAY OF CYCLE</span>
            <span style={{ fontSize: ".88rem", fontWeight: 800, color: "#6E3482", marginTop: 4 }}>{meta.label} Phase</span>
            <span style={{ fontSize: "1.3rem", marginTop: 2 }}>{meta.emoji}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[["#fca5a5","Period"],["#fde68a","Fertile window"]].map(([c,l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              <span style={{ fontSize: ".7rem", fontWeight: 600, color: "#8A6A9A" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info cards row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px 10px" }}>
        {[
          {
            icon: "🛡️", label: "NEXT PERIOD", labelColor: "#2A8A44", bg: "rgba(232,248,238,0.82)", border: "rgba(100,200,130,0.3)",
            value: predictions ? (predictions.daysUntilPeriod > 0 ? `${predictions.daysUntilPeriod} days` : "Today") : "—",
            valueColor: "#166534",
            sub: predictions ? predictions.nextPeriod.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Set up cycle",
          },
          {
            icon: "🔮", label: "CURRENT CYCLE", labelColor: "#B85E20", bg: "rgba(255,243,232,0.82)", border: "rgba(224,160,80,0.3)",
            value: meta.label,
            valueColor: "#92400e",
            sub: predictions ? `${predictions.fertileStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${predictions.fertileEnd.toLocaleDateString("en-US",{month:"short",day:"numeric"})}` : "",
          },
        ].map((c, i) => (
          <div key={i} className="glass-card" style={{ background: c.bg, borderColor: c.border, padding: "14px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: "1rem" }}>{c.icon}</span>
              <span style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".6px", color: c.labelColor }}>{c.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: c.valueColor, lineHeight: 1.1 }}>{c.value}</p>
            <p style={{ margin: "3px 0 0", fontSize: ".72rem", fontWeight: 500, color: "#8A6A9A" }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Action cards row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px 16px" }}>
        {/* Log card */}
        <div className="glass-card tint-pink" style={{ padding: "14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: ".6rem", fontWeight: 800, letterSpacing: ".5px", color: "#9d174d" }}>🕐 TODAY'S LOG</p>
          {todayLog ? (
            <>
              <p style={{ margin: 0, fontSize: ".92rem", fontWeight: 800, color: "#9d174d" }}>Logged ✓</p>
              <p style={{ margin: "2px 0 8px", fontSize: ".72rem", color: "#be185d" }}>{todayLog.mood} · {todayLog.energy}</p>
            </>
          ) : (
            <Link href="/log" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: "50%", marginBottom: 6,
              background: "linear-gradient(135deg,#6E3482,#49225B)",
              boxShadow: "0 4px 14px rgba(110,52,130,0.35)",
              color: "#fff", fontSize: "1.4rem", fontWeight: 700, textDecoration: "none",
            }}>+</Link>
          )}
          <Link href="/log" style={{
            display: "block", textAlign: "center", fontSize: ".72rem", fontWeight: 700,
            padding: "7px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.7)",
            color: "#6E3482", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}>Log Symptoms</Link>
        </div>

        {/* About today card */}
        <div className="glass-card tint-purple" style={{ padding: "14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: ".6rem", fontWeight: 800, letterSpacing: ".5px", color: "#4c1d95" }}>📸 ABOUT TODAY</p>
          <span style={{ fontSize: "1.8rem", display: "block", marginBottom: 4 }}>{meta.emoji}</span>
          <p style={{ margin: 0, fontSize: ".88rem", fontWeight: 800, color: "#1C0B2E" }}>{meta.label} Day {dayOfCycle}</p>
          <Link href="/insights" style={{
            display: "block", textAlign: "center", fontSize: ".72rem", fontWeight: 700,
            marginTop: 8, padding: "7px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.7)",
            color: "#6E3482", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}>Read More</Link>
        </div>
      </div>

      {/* Setup prompt */}
      {data.cycles.length === 0 && (
        <div style={{ margin: "0 16px" }} className="glass-card" >
          <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: "1rem", color: "#6E3482", textAlign: "center" }}>Set up your cycle 🌸</p>
          <p style={{ margin: "0 0 14px", fontSize: ".8rem", color: "#8A6A9A", textAlign: "center" }}>Log your last period to unlock predictions</p>
          <Link href="/log" style={{
            display: "block", textAlign: "center", fontWeight: 800, fontSize: ".92rem",
            padding: "13px", borderRadius: 14, color: "#fff", textDecoration: "none",
            background: "linear-gradient(135deg,#6E3482,#49225B)",
            boxShadow: "0 8px 24px rgba(110,52,130,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}>Start Tracking →</Link>
        </div>
      )}
    </div>
  );
}
