"use client";
import { useEffect, useState } from "react";
import { loadData, getPredictions, getPredictionWindow, getAveragePeriodLength, getAverageCycleLength, PHASE_META, type BloomData, type Phase } from "@/lib/cycle";
import { phaseForDate } from "@/lib/insights";
import { fetchFromSheet } from "@/lib/data";
import { localDateStr } from "@/lib/day";
import TopBar from "@/components/TopBar";
import LogSheet from "@/components/LogSheet";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#fca5a5", follicular: "#c4b5fd", ovulation: "#fde68a", luteal: "#a5b4fc",
};
const FERTILE_COLOR = "#6ee7b7"; // teal-green for fertile window

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
        phase = phaseFromDay((diff % avg) + 1, avg);
      }
    }
    // Fertile window: between fertileStart and fertileEnd (inclusive)
    const isFertile = predictions
      ? dateStr >= localDateStr(predictions.fertileStart) && dateStr <= localDateStr(predictions.fertileEnd)
      : false;
    return { phase, hasLog, isToday, isFertile };
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
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: FERTILE_COLOR }} />
          <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#6E3482" }}>Fertile window</span>
        </div>
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
            const { phase, hasLog, isToday, isFertile } = getDayInfo(day);
            const cellStr = localDateStr(new Date(year, month, day));
            const isFuture = cellStr > localDateStr(today);
            // Fertile window overrides phase color for future days; for past days show as overlay dot
            const bgColor = isFertile && isFuture
              ? FERTILE_COLOR
              : phase ? PHASE_COLORS[phase] : "rgba(255,255,255,0.35)";
            const cell = (
              <div style={{
                aspectRatio: "1", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                borderRadius: 12, fontSize: ".78rem", fontWeight: 800,
                background: bgColor,
                outline: isToday ? "2.5px solid #6E3482" : "none", outlineOffset: 1,
                color: "#1C0B2E", position: "relative", opacity: isFuture ? 0.5 : 1,
                cursor: isFuture ? "default" : "pointer",
              }}>
                {day}
                {/* Fertile window indicator for past/today days */}
                {isFertile && !isFuture && (
                  <div style={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#059669" }} />
                )}
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
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#1C0B2E", textAlign: "center" }}>Upcoming</h2>
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

      {/* ── Cycle Trends ── */}
      {(() => {
        const avgCycleLen = getAverageCycleLength(data);
        const completed = data.cycles.filter(c => c.cycleLength && c.cycleLength >= 10);
        if (completed.length < 1) return null;

        const last = completed[completed.length - 1];
        const prev = completed.length >= 2 ? completed[completed.length - 2] : null;
        const variation = prev ? last.cycleLength! - prev.cycleLength! : 0;
        const motivational = Math.abs(variation) <= 2
          ? "Your body's rhythm is remarkably stable"
          : variation > 0
            ? `This cycle ran ${variation}d longer — totally normal`
            : `This cycle ran ${Math.abs(variation)}d shorter — you're in sync`;

        function phaseColor(day: number, cycLen: number, pLen: number): string {
          const ovDay = Math.max(pLen + 3, cycLen - 14);
          if (day <= pLen) return '#fca5a5';
          if (day < ovDay - 1) return '#c4b5fd';
          if (day <= ovDay + 1) return '#fde68a';
          return '#a5b4fc';
        }

        const barCycles = completed.slice(-5);
        const chartCycles = completed.filter(c => c.periodLength).slice(-6);

        // SVG chart dims
        const W = 300, H = 110;
        const PAD = { l: 26, r: 30, t: 8, b: 22 };
        const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
        const cycleLens = chartCycles.map(c => c.cycleLength!);
        const periodLens = chartCycles.map(c => c.periodLength!);
        const allV = [...cycleLens, ...periodLens];
        const yMin = Math.max(0, Math.min(...allV) - 4);
        const yMax = Math.max(...allV) + 4;
        const n = chartCycles.length;
        const xS = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
        const yS = (v: number) => PAD.t + iH - ((v - yMin) / (yMax - yMin)) * iH;
        const pts = (vals: number[]) => vals.map((v, i) => `${xS(i)},${yS(v)}`).join(' ');
        const mth = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });

        return (
          <>
            <h2 style={{ margin: '16px 0 10px', fontSize: '1rem', fontWeight: 800, color: '#1C0B2E', textAlign: 'center' }}>Cycle Trends</h2>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Avg period', value: periodLen, color: '#fca5a5', bg: 'rgba(252,165,165,0.13)' },
                { label: 'Avg cycle',  value: avgCycleLen, color: '#a5b4fc', bg: 'rgba(165,180,252,0.13)' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ flex: 1, padding: '12px 14px', background: s.bg, border: `1px solid ${s.color}55` }}>
                  <p style={{ margin: '0 0 3px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#1C0B2E', lineHeight: 1 }}>{s.value}<span style={{ fontSize: '.75rem', fontWeight: 700, color: '#8A6A9A', marginLeft: 3 }}>days</span></p>
                </div>
              ))}
            </div>

            {/* Cycle comparison */}
            <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
              <p style={{ margin: '0 0 10px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>Cycle Length</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {prev && (
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: 12, background: 'rgba(165,180,252,0.12)', border: '1px solid rgba(165,180,252,0.3)' }}>
                    <p style={{ margin: '0 0 2px', fontSize: '.65rem', color: '#8A6A9A', fontWeight: 700 }}>Last cycle</p>
                    <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1C0B2E' }}>{prev.cycleLength} <span style={{ fontSize: '.7rem', color: '#8A6A9A' }}>days</span></p>
                  </div>
                )}
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 12, background: '#1C0B2E' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>This cycle</p>
                  <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{last.cycleLength} <span style={{ fontSize: '.7rem', color: 'rgba(255,255,255,0.5)' }}>days</span></p>
                </div>
              </div>
              {prev && (
                <p style={{ margin: '0 0 3px', fontSize: '.8rem', fontWeight: 700, color: Math.abs(variation) <= 2 ? '#059669' : '#d97706' }}>
                  Variation: {variation === 0 ? '0 days' : `${variation > 0 ? '+' : ''}${variation} days`}
                </p>
              )}
              <p style={{ margin: 0, fontSize: '.8rem', color: '#6E3482', fontWeight: 600 }}>{motivational}</p>
            </div>

            {/* Mini cycle bars */}
            {barCycles.length > 0 && (
              <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
                <p style={{ margin: '0 0 10px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>Cycle History</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {barCycles.map((c, idx) => {
                    const len = c.cycleLength!;
                    const pLen = c.periodLength ?? periodLen;
                    const label = new Date(c.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A', minWidth: 38, textAlign: 'right', flexShrink: 0 }}>{label}</span>
                        <div style={{ flex: 1, display: 'flex', gap: 1.5 }}>
                          {Array.from({ length: len }, (_, d) => (
                            <div key={d} style={{
                              flex: 1, height: 16,
                              background: phaseColor(d + 1, len, pLen),
                              borderRadius: d === 0 ? '4px 0 0 4px' : d === len - 1 ? '0 4px 4px 0' : 0,
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A', minWidth: 22, flexShrink: 0 }}>{len}d</span>
                      </div>
                    );
                  })}
                </div>
                {/* Phase color legend */}
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {[['#fca5a5','Menstrual'],['#c4b5fd','Follicular'],['#fde68a','Ovulation'],['#a5b4fc','Luteal']].map(([color, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rhythm line chart */}
            {chartCycles.length >= 2 && (
              <div className="glass-card" style={{ padding: '14px 16px', marginBottom: 10 }}>
                <p style={{ margin: '0 0 1px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>Cycle Rhythm</p>
                <p style={{ margin: '0 0 10px', fontSize: '.7rem', color: '#8A6A9A' }}>Last {chartCycles.length} cycles</p>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
                  {/* Grid */}
                  {[yMin, Math.round((yMin + yMax) / 2), yMax].map((v, i) => (
                    <g key={i}>
                      <line x1={PAD.l} x2={W - PAD.r} y1={yS(v)} y2={yS(v)} stroke="rgba(165,106,189,0.12)" strokeWidth={1} />
                      <text x={PAD.l - 4} y={yS(v) + 3.5} textAnchor="end" fill="#8A6A9A" fontSize={7.5} fontWeight={700}>{Math.round(v)}</text>
                    </g>
                  ))}
                  {/* Cycle days line (solid violet) */}
                  <polyline points={pts(cycleLens)} fill="none" stroke="#a5b4fc" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {cycleLens.map((v, i) => (
                    <circle key={i} cx={xS(i)} cy={yS(v)} r={3.5} fill="#fff" stroke="#a5b4fc" strokeWidth={2} />
                  ))}
                  {/* Period days line (dashed rose) */}
                  <polyline points={pts(periodLens)} fill="none" stroke="#fca5a5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 2.5" />
                  {periodLens.map((v, i) => (
                    <circle key={i} cx={xS(i)} cy={yS(v)} r={3} fill="#fff" stroke="#fca5a5" strokeWidth={2} />
                  ))}
                  {/* X labels */}
                  {chartCycles.map((c, i) => (
                    <text key={i} x={xS(i)} y={H - 4} textAnchor="middle" fill="#8A6A9A" fontSize={7.5} fontWeight={700}>{mth(c.startDate)}</text>
                  ))}
                  {/* End value labels */}
                  <text x={xS(n - 1) + 5} y={yS(cycleLens[n - 1]) + 4} fill="#a5b4fc" fontSize={8} fontWeight={800}>{cycleLens[n - 1]}d</text>
                  <text x={xS(n - 1) + 5} y={yS(periodLens[n - 1]) + 4} fill="#fca5a5" fontSize={8} fontWeight={800}>{periodLens[n - 1]}d</text>
                </svg>
                <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                  {[{ label: 'Cycle days', color: '#a5b4fc', dash: false }, { label: 'Period days', color: '#fca5a5', dash: true }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width={20} height={4}><line x1={0} y1={2} x2={20} y2={2} stroke={l.color} strokeWidth={2.5} strokeDasharray={l.dash ? '4 2' : undefined} /></svg>
                      <span style={{ fontSize: '.68rem', color: '#8A6A9A', fontWeight: 700 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
    </>
  );
}
