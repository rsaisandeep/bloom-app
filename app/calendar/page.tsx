"use client";
import { useEffect, useState } from "react";
import { loadData, getPredictions, getPredictionWindow, getAveragePeriodLength, PHASE_META, type BloomData, type Phase } from "@/lib/cycle";
import { phaseForDate } from "@/lib/insights";
import { fetchFromSheet } from "@/lib/data";
import { localDateStr } from "@/lib/day";
import TopBar from "@/components/TopBar";
import LogSheet from "@/components/LogSheet";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#fca5a5", follicular: "#c4b5fd", ovulation: "#fde68a", luteal: "#a5b4fc",
};

export default function CalendarPage() {
  const [data, setData] = useState<BloomData>(() => loadData());
  const [logDate, setLogDate] = useState<string | null>(null);
  // Month currently shown (1st of month). Starts on the real current month.
  const [view, setView] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  useEffect(() => { fetchFromSheet().then(setData); }, []);
  useEffect(() => {
    function onRefresh() { fetchFromSheet().then(setData); }
    window.addEventListener('bloom:refresh', onRefresh);
    return () => window.removeEventListener('bloom:refresh', onRefresh);
  }, []);

  const today = new Date();
  const year = view.getFullYear(), month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const predictions = getPredictions(data);
  const pcosMode = !!data.settings?.pcosMode;
  const predWindow = pcosMode ? getPredictionWindow(data) : null;
  const fmtD = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastStart = data.cycles.length > 0 ? new Date(data.cycles[data.cycles.length - 1].startDate) : null;
  const periodLen = getAveragePeriodLength(data);
  const todayStr = localDateStr(today);

  function phaseFromDay(d: number, cycleLen: number): Phase {
    const ovDay = Math.max(periodLen + 3, cycleLen - 14);
    if (d <= periodLen) return "menstrual";
    if (d < ovDay - 1) return "follicular";
    if (d <= ovDay + 1) return "ovulation";
    return "luteal";
  }

  // Past/current days use real logged cycles; future days are projected forward
  // from the last period in average-length cycles (so the next period shows up
  // in the month it actually falls in).
  function getDayInfo(day: number) {
    const date = new Date(year, month, day);
    const dateStr = localDateStr(date);
    const isToday = dateStr === todayStr;
    const hasLog = data.logs.some((l) => l.date === dateStr);
    let phase: Phase | null = null;
    if (lastStart) {
      if (dateStr <= todayStr) {
        phase = phaseForDate(data, dateStr);
      } else if (predictions) {
        const diff = Math.round((date.getTime() - lastStart.getTime()) / 86400000);
        const avg = predictions.avgLength;
        phase = phaseFromDay((diff % avg) + 1, avg); // position within the projected cycle
      }
    }
    return { phase, hasLog, isToday };
  }

  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const navBtn = { width: 34, height: 34, borderRadius: 999, border: "none", cursor: "pointer", background: "rgba(165,106,189,0.15)", color: "#6E3482", fontSize: 16, fontWeight: 800, fontFamily: "var(--font-outfit)", display: "flex", alignItems: "center", justifyContent: "center" } as const;

  return (
    <><TopBar title="Calendar" />
    <div style={{ minHeight: "100vh", padding: "4px 16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 14px" }}>
        <button aria-label="Previous month" onClick={() => setView(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <p style={{ margin: 0, fontSize: ".95rem", fontWeight: 800, color: "#1C0B2E" }}>{monthLabel}</p>
        <button aria-label="Next month" onClick={() => setView(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>

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
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: ".68rem", fontWeight: 800, color: "#8A6A9A", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {Array(firstDay).fill(null).map((_,i) => <div key={`b${i}`} />)}
          {Array.from({length: daysInMonth}, (_,i) => i+1).map((day) => {
            const { phase, hasLog, isToday } = getDayInfo(day);
            const cellStr = localDateStr(new Date(year, month, day));
            const isFuture = cellStr > localDateStr(today);
            const cell = (
              <div style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                borderRadius: 12, fontSize: ".78rem", fontWeight: 800,
                background: phase ? PHASE_COLORS[phase] : "rgba(255,255,255,0.35)",
                outline: isToday ? "2.5px solid #6E3482" : "none", outlineOffset: 1,
                color: "#1C0B2E", position: "relative", opacity: isFuture ? 0.4 : 1,
                cursor: isFuture ? "default" : "pointer",
              }}>
                {day}
                {hasLog && <div style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: "#6E3482" }} />}
              </div>
            );
            return isFuture
              ? <div key={day}>{cell}</div>
              : <button key={day} onClick={() => setLogDate(cellStr)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%' }}>{cell}</button>;
          })}
        </div>
      </div>

      <LogSheet
        open={!!logDate}
        date={logDate ?? undefined}
        onClose={() => setLogDate(null)}
        onSaved={() => { setLogDate(null); fetchFromSheet().then(setData); }}
      />

      {/* Predictions */}
      {predictions && (
        <>
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#1C0B2E" }}>Upcoming</h2>
          <div className="glass-card" style={{ padding: "14px 16px" }}>
            {[
              pcosMode && predWindow
                ? { dot: "#fca5a5", label: "Period likely",  value: `${fmtD(predWindow.early)} – ${fmtD(predWindow.late)}`, vc: "#dc2626" }
                : predictions.uncertainty > 0
                  ? { dot: "#fca5a5", label: "Next period",   value: `${fmtD(predictions.nextPeriodEarliest)} – ${fmtD(predictions.nextPeriodLatest)}`, vc: "#dc2626" }
                  : { dot: "#fca5a5", label: "Next period",   value: fmtD(predictions.nextPeriod), vc: "#dc2626" },
              { dot: "#fde68a", label: "Fertile window",   value: `${fmtD(predictions.fertileStart)} – ${fmtD(predictions.fertileEnd)}`, vc: "#d97706" },
              { dot: "#c4b5fd", label: pcosMode ? "Typical cycle" : "Avg cycle length", value: `${predictions.avgLength} days`, vc: "#6E3482" },
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
    </>
  );
}
