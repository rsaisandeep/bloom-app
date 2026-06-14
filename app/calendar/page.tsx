"use client";
import { useEffect, useState } from "react";
import { loadData, getPredictions, PHASE_META, type BloomData } from "@/lib/cycle";
import { fetchFromSheet } from "@/lib/data";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#fca5a5", follicular: "#c4b5fd", ovulation: "#fde68a", luteal: "#a5b4fc",
};
function getDayPhase(d: number) {
  if (d <= 0) return null;
  if (d <= 5) return "menstrual";
  if (d <= 13) return "follicular";
  if (d <= 16) return "ovulation";
  return "luteal";
}

export default function CalendarPage() {
  const [data, setData] = useState<BloomData>(() => loadData()); // instant from cache
  useEffect(() => { fetchFromSheet().then(setData); }, []); // then sync from sheet

  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const predictions = getPredictions(data.cycles);
  const lastStart = data.cycles.length > 0 ? new Date(data.cycles[data.cycles.length-1].startDate) : null;

  function getDayInfo(day: number) {
    const date = new Date(year, month, day);
    if (!lastStart) return { phase: null, hasLog: false, isToday: false };
    const diff = Math.floor((date.getTime() - lastStart.getTime()) / 86400000);
    const phase = getDayPhase(diff + 1);
    const dateStr = date.toISOString().split("T")[0];
    return { phase, hasLog: data.logs.some((l) => l.date === dateStr), isToday: day === today.getDate() };
  }

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 24px" }}>
      <h1 style={{ margin: "0 0 2px", fontSize: "1.75rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: "-.02em" }}>Calendar</h1>
      <p style={{ margin: "0 0 16px", fontSize: ".78rem", fontWeight: 600, color: "#8A6A9A" }}>
        {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        {Object.entries(PHASE_META).map(([key, meta]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: PHASE_COLORS[key] }} />
            <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#6E3482" }}>{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="glass-card" style={{ padding: "14px 14px 16px", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 8 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: ".68rem", fontWeight: 800, color: "#8A6A9A", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {Array(firstDay).fill(null).map((_,i) => <div key={`b${i}`} />)}
          {Array.from({length: daysInMonth}, (_,i) => i+1).map((day) => {
            const { phase, hasLog, isToday } = getDayInfo(day);
            return (
              <div key={day} style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                borderRadius: 12, fontSize: ".78rem", fontWeight: 800,
                background: phase ? PHASE_COLORS[phase] : "rgba(255,255,255,0.35)",
                outline: isToday ? "2.5px solid #6E3482" : "none", outlineOffset: 1,
                color: "#1C0B2E", position: "relative",
              }}>
                {day}
                {hasLog && <div style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: "#6E3482" }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Predictions */}
      {predictions && (
        <>
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#1C0B2E" }}>Upcoming</h2>
          <div className="glass-card" style={{ padding: "14px 16px" }}>
            {[
              { dot: "#fca5a5", label: "Next period",      value: predictions.nextPeriod.toLocaleDateString("en-US",{month:"short",day:"numeric"}),  vc: "#dc2626" },
              { dot: "#fde68a", label: "Fertile window",   value: `${predictions.fertileStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${predictions.fertileEnd.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`, vc: "#d97706" },
              { dot: "#c4b5fd", label: "Avg cycle length", value: `${predictions.avgLength} days`, vc: "#6E3482" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(165,106,189,0.15)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.dot }} />
                  <span style={{ fontSize: ".85rem", fontWeight: 600, color: "#1C0B2E" }}>{item.label}</span>
                </div>
                <span style={{ fontSize: ".85rem", fontWeight: 800, color: item.vc }}>{item.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
