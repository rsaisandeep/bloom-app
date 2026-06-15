"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadData, saveLog, startPeriod, isNewPeriodStart, type DayLog } from "@/lib/cycle";
import { appDayKey } from "@/lib/day";
import { fetchFromSheet, saveToSheet } from "@/lib/data";
import TopBar from "@/components/TopBar";

type Option = { value: string; label: string; emoji: string };
const FIELDS: { key: keyof DayLog; label: string; options: Option[] }[] = [
  { key: "flow",     label: "Flow Today",          options: [{value:"none",label:"None",emoji:"⬜"},{value:"light",label:"Light",emoji:"🩸"},{value:"medium",label:"Medium",emoji:"🩸🩸"},{value:"heavy",label:"Heavy",emoji:"🩸🩸🩸"}] },
  { key: "cramps",   label: "Cramps",              options: [{value:"none",label:"None",emoji:"😌"},{value:"mild",label:"Mild",emoji:"😐"},{value:"moderate",label:"Moderate",emoji:"😣"},{value:"severe",label:"Severe",emoji:"😫"}] },
  { key: "mood",     label: "Mood",                options: [{value:"happy",label:"Happy",emoji:"😊"},{value:"calm",label:"Calm",emoji:"😌"},{value:"energetic",label:"Energetic",emoji:"⚡"},{value:"anxious",label:"Anxious",emoji:"😰"},{value:"irritable",label:"Irritable",emoji:"😤"},{value:"sad",label:"Sad",emoji:"😢"},{value:"fatigued",label:"Fatigued",emoji:"😴"}] },
  { key: "energy",   label: "Energy Level",        options: [{value:"high",label:"High",emoji:"🔋"},{value:"medium",label:"Medium",emoji:"🔆"},{value:"low",label:"Low",emoji:"🪫"},{value:"exhausted",label:"Exhausted",emoji:"💤"}] },
  { key: "bloating", label: "Bloating",            options: [{value:"none",label:"None",emoji:"✅"},{value:"mild",label:"Mild",emoji:"😤"},{value:"severe",label:"Severe",emoji:"🫃"}] },
  { key: "sleep",    label: "Last Night's Sleep",  options: [{value:"good",label:"Good",emoji:"😴"},{value:"poor",label:"Poor",emoji:"😪"},{value:"insomnia",label:"Insomnia",emoji:"👀"}] },
  { key: "cravings", label: "Cravings",            options: [{value:"none",label:"None",emoji:"🙅"},{value:"sweet",label:"Sweet",emoji:"🍫"},{value:"salty",label:"Salty",emoji:"🧂"},{value:"everything",label:"Everything",emoji:"🍕"}] },
];
const DEFAULTS: Partial<DayLog> = { cramps:"none",energy:"medium",mood:"calm",bloating:"none",sleep:"good",cravings:"none",flow:"none" };

export default function LogPage() {
  const router = useRouter();
  const today = appDayKey();
  // Target date can be overridden via ?date= (e.g. tapping a past day on the calendar).
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState<"reports" | "cycle">("cycle");
  const [form, setForm] = useState<Partial<DayLog>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isToday = date === today;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("date");
    if (q && q <= today) setDate(q);
    if (params.get("from") === "reports") setFrom("reports");
  }, [today]);

  useEffect(() => {
    const cachedLog = loadData().logs.find((l) => l.date === date);
    setForm(cachedLog ?? DEFAULTS);
    fetchFromSheet().then((data) => {
      const existing = data.logs.find((l) => l.date === date);
      if (existing) setForm(existing);
    });
  }, [date]);

  function select(key: keyof DayLog, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "flow" && value !== "none") {
      const data = loadData();
      if (isNewPeriodStart(data, date)) {
        const session = (() => { try { return JSON.parse(localStorage.getItem("bloom_session") || "{}"); } catch { return {}; } })();
        startPeriod(date, session.username || "me");
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    const log = { ...DEFAULTS, ...form, date } as DayLog;
    saveLog(log); // update local cache immediately
    await saveToSheet(loadData()); // persist to sheet
    setSaved(true);
    const dest = !isToday ? "/calendar" : from === "reports" ? "/reports" : "/";
    setTimeout(() => router.push(dest), 500);
  }

  return (
    <><TopBar />
    <div style={{ minHeight: "100vh", padding: "4px 16px 24px" }}>
      {/* Back button */}
      <button onClick={() => router.back()} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
        cursor: "pointer", color: "#6E3482", fontSize: 14, fontWeight: 600,
        padding: "0 0 14px", fontFamily: "inherit",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="#6E3482" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.75rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: "-.02em" }}>
        {isToday ? "Today's Check-in" : "Edit Log"}
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <input
          type="date"
          max={today}
          value={date}
          onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
          style={{
            background: "rgba(255,255,255,0.6)", border: "1px solid rgba(165,106,189,0.3)",
            borderRadius: 12, padding: "8px 12px", fontSize: ".85rem", fontWeight: 600,
            color: "#6E3482", fontFamily: "inherit", outline: "none",
          }}
        />
        {!isToday && (
          <button onClick={() => setDate(today)} style={{
            background: "rgba(165,106,189,0.12)", border: "none", borderRadius: 999,
            padding: "7px 12px", fontSize: ".72rem", fontWeight: 700, color: "#6E3482",
            cursor: "pointer", fontFamily: "inherit",
          }}>Jump to today</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FIELDS.map((field) => (
          <div key={field.key} className="glass-card" style={{ padding: "16px 16px 14px" }}>
            <p style={{ margin: "0 0 12px", fontSize: ".78rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: ".1px", textTransform: "uppercase" }}>
              {field.label}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {field.options.map((opt) => {
                const active = form[field.key] === opt.value;
                return (
                  <button key={opt.value} onClick={() => select(field.key, opt.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "9px 14px", borderRadius: 14, fontSize: ".82rem", fontWeight: 700,
                      cursor: "pointer", transition: "all .18s cubic-bezier(.22,.61,.36,1)",
                      border: active ? "1px solid rgba(110,52,130,0.5)" : "1px solid var(--glass-border-dim)",
                      background: active
                        ? "rgba(110,52,130,0.12)"
                        : "rgba(255,255,255,0.45)",
                      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                      color: active ? "#6E3482" : "#1C0B2E",
                      boxShadow: active
                        ? "0 0 0 2px rgba(110,52,130,0.2)"
                        : "0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}>
                    <span>{opt.emoji}</span><span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} style={{
        width: "100%", marginTop: 16, padding: "14px", border: 0,
        borderRadius: 16, fontWeight: 800, fontSize: "1rem", color: "#fff",
        background: saved ? "linear-gradient(135deg,#22c55e,#16a34a)" : saving ? "rgba(110,52,130,0.5)" : "linear-gradient(135deg,#6E3482,#49225B)",
        boxShadow: saved ? "0 8px 24px rgba(34,197,94,0.35)" : "0 8px 24px rgba(110,52,130,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
        cursor: saving ? "default" : "pointer", transition: "all .2s cubic-bezier(.22,.61,.36,1)",
        fontFamily: "inherit",
      }}>
        {saved ? "✓ Saved!" : saving ? "Saving to your journal…" : !isToday ? "Save changes →" : from === "reports" ? "Get my reports →" : "Get my actions →"}
      </button>
    </div>
    </>
  );
}
