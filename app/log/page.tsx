"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadData, saveLog, startPeriod, type DayLog } from "@/lib/cycle";

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
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<Partial<DayLog>>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = loadData();
    const existing = data.logs.find((l) => l.date === today);
    if (existing) setForm(existing);
  }, [today]);

  function select(key: keyof DayLog, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "flow" && value !== "none") {
      const data = loadData();
      const hasOpen = data.cycles.length > 0 && !data.cycles[data.cycles.length-1].endDate;
      if (!hasOpen) startPeriod(today);
    }
  }

  function handleSave() {
    saveLog({ ...DEFAULTS, ...form, date: today } as DayLog);
    setSaved(true);
    setTimeout(() => router.push("/insights"), 700);
  }

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px 24px" }}>
      <h1 style={{ margin: "0 0 2px", fontSize: "1.75rem", fontWeight: 800, color: "#1C0B2E", letterSpacing: "-.02em" }}>
        Today's Check-in
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: ".78rem", fontWeight: 600, color: "#8A6A9A" }}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>

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
        background: saved ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#6E3482,#49225B)",
        boxShadow: saved ? "0 8px 24px rgba(34,197,94,0.35)" : "0 8px 24px rgba(110,52,130,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
        cursor: "pointer", transition: "all .2s cubic-bezier(.22,.61,.36,1)",
        fontFamily: "inherit",
      }}>
        {saved ? "✓ Saved! Loading insights..." : "Get My Recommendations →"}
      </button>
    </div>
  );
}
