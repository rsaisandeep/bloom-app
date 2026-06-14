"use client";
import { useEffect, useState } from "react";
import { loadData, getCurrentPhase, PHASE_META } from "@/lib/cycle";
import type { Recommendations } from "@/lib/matcher";
import Link from "next/link";

const REC_CARDS = [
  { key:"food",     emoji:"🥗", label:"FOOD & NUTRITION",    bg:"rgba(232,248,238,0.82)", border:"rgba(100,200,130,0.3)", titleColor:"#166534" },
  { key:"exercise", emoji:"🏃", label:"MOVEMENT & EXERCISE", bg:"rgba(237,233,255,0.85)", border:"rgba(165,106,189,0.3)", titleColor:"#4c1d95" },
  { key:"selfcare", emoji:"💆", label:"SELF-CARE",           bg:"rgba(252,232,240,0.85)", border:"rgba(200,100,140,0.3)", titleColor:"#9d174d" },
];

export default function InsightsPage() {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [phase, setPhase] = useState("follicular");
  const [openScience, setOpenScience] = useState<string | null>(null);
  const [noLog, setNoLog] = useState(false);

  useEffect(() => {
    const data = loadData();
    const { phase: p } = getCurrentPhase(data.cycles);
    setPhase(p);
    const todayLog = data.logs.find((l) => l.date === new Date().toISOString().split("T")[0]);
    if (!todayLog) setNoLog(true);
    fetch("/api/recommendations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: p, log: todayLog ?? {} }),
    }).then((r) => r.json()).then(setRecs);
  }, []);

  const meta = PHASE_META[phase as keyof typeof PHASE_META];

  if (!recs) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", animation: "pulse 1.5s infinite" }}>🌸</div>
        <p style={{ marginTop: 12, fontSize: ".85rem", fontWeight: 600, color: "#8A6A9A" }}>Personalizing your insights...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: "-.02em" }}>Your Insights</h1>
          <p style={{ margin: "2px 0 0", fontSize: ".78rem", fontWeight: 600, color: "#8A6A9A" }}>Personalized for today</p>
        </div>
        <span style={{ fontSize: "2rem" }}>{meta.emoji}</span>
      </div>

      {noLog && (
        <div className="glass-card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", borderColor: "rgba(165,106,189,0.4)" }}>
          <p style={{ margin: 0, fontSize: ".78rem", fontWeight: 600, color: "#6E3482" }}>Log today's symptoms for better recs</p>
          <Link href="/log" style={{
            fontSize: ".72rem", fontWeight: 800, padding: "7px 14px", borderRadius: 10,
            background: "linear-gradient(135deg,#6E3482,#49225B)", color: "#fff", textDecoration: "none",
            boxShadow: "0 4px 12px rgba(110,52,130,0.3)",
          }}>Log →</Link>
        </div>
      )}

      {/* Phase banner — glass with purple gradient */}
      <div style={{
        borderRadius: 24, padding: "18px 18px 16px", marginBottom: 16,
        background: "linear-gradient(135deg,#6E3482,#49225B)",
        boxShadow: "0 8px 32px rgba(110,52,130,0.30), inset 0 1px 0 rgba(255,255,255,0.15)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0) 60%)", pointerEvents: "none", borderRadius: "inherit" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: "2.5rem" }}>{meta.emoji}</span>
          <div>
            <p style={{ margin: 0, fontSize: ".6rem", fontWeight: 800, letterSpacing: ".6px", color: "rgba(255,255,255,0.6)" }}>CURRENT PHASE</p>
            <p style={{ margin: "2px 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>{meta.label} Phase</p>
            <p style={{ margin: "2px 0 0", fontSize: ".7rem", color: "rgba(255,255,255,0.55)" }}>{recs.hormoneProfile}</p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: ".82rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>{recs.phaseDescription}</p>
      </div>

      {/* Rec cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {REC_CARDS.map(({ key, emoji, label, bg, border, titleColor }) => {
          const d = recs[key as keyof Recommendations] as { text: string; science: string };
          const isOpen = openScience === key;
          return (
            <div key={key} className="glass-card" style={{ background: bg, borderColor: border, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>{emoji}</span>
                <span style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".6px", color: titleColor }}>{label}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: ".88rem", fontWeight: 600, color: "#1C0B2E", lineHeight: 1.6 }}>{d.text}</p>
              <button onClick={() => setOpenScience(isOpen ? null : key)}
                style={{
                  background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  borderRadius: 10, padding: "6px 12px", fontSize: ".72rem", fontWeight: 700,
                  color: "#6E3482", cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                  fontFamily: "inherit",
                }}>
                {isOpen ? "▲ Hide science" : "▼ Why this works"}
              </button>
              {isOpen && (
                <div style={{
                  marginTop: 10, padding: "10px 12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.5)", borderLeft: "3px solid #A56ABD",
                  fontSize: ".75rem", fontStyle: "italic", color: "#6E3482", lineHeight: 1.6,
                }}>{d.science}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
