'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { loadData, getCurrentPhase, PHASE_META, type BloomData, type DayLog, type Phase } from '@/lib/cycle';
import { computeInsights, type Insights, type TrendPoint } from '@/lib/insights';
import type { Recommendations } from '@/lib/matcher';
import { fetchFromSheet, sanitize } from '@/lib/data';
import { appDayKey } from '@/lib/day';
import TopBar from '@/components/TopBar';
import LogSheet from '@/components/LogSheet';

const REC_CARDS = [
  { key: 'food',     emoji: '🥗', label: 'Food & Nutrition', tint: 'rgba(232,248,238,0.82)', border: 'rgba(100,200,130,0.3)', color: '#166534' },
  { key: 'exercise', emoji: '🏃', label: 'Movement',         tint: 'rgba(237,233,255,0.85)', border: 'rgba(165,106,189,0.3)', color: '#4c1d95' },
  { key: 'selfcare', emoji: '💆', label: 'Self-care',        tint: 'rgba(252,232,240,0.85)', border: 'rgba(200,100,140,0.3)', color: '#9d174d' },
];

function IOSSpinner({ color = '#6E3482', size = 36 }: { color?: string; size?: number }) {
  const n = 12;
  const lineW = Math.max(2, Math.round(size * 0.085));
  const lineH = Math.round(size * 0.28);
  const topOffset = Math.round(size * 0.12);
  const pivotY = Math.round(size * 0.5 - topOffset);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: lineW, height: lineH,
          borderRadius: lineW,
          background: color,
          top: topOffset,
          left: '50%',
          marginLeft: -lineW / 2,
          transformOrigin: `${lineW / 2}px ${pivotY}px`,
          transform: `rotate(${i * (360 / n)}deg)`,
          animation: `iosSpinner 1s ${-((n - i) / n).toFixed(3)}s linear infinite`,
        }} />
      ))}
    </div>
  );
}

function TrendChart({ points, unit, decimals = 1 }: { points: TrendPoint[]; unit: string; decimals?: number }) {
  const W = 320, H = 64, pad = 5;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => pad + (i / (n - 1 || 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[n - 1].value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8A6A9A', marginBottom: 4 }}>
        <span>latest <strong style={{ color: '#6E3482' }}>{last.toFixed(decimals)}{unit}</strong></span>
        <span>{min.toFixed(decimals)}–{max.toFixed(decimals)}{unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
        <path d={d} fill="none" stroke="#6E3482" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Patterns({ insights }: { insights: Insights }) {
  const { cycleStats, symptoms, byPhase, correlations, loggedDays } = insights;
  const maxBar = cycleStats ? Math.max(cycleStats.avg, ...cycleStats.history, 1) : 1;
  const maxSym = symptoms[0]?.count ?? 1;
  const phaseRows = byPhase.filter((p) => p.count > 0);
  const { bbtTrend, weightTrend } = insights;

  return (
    <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#1C0B2E' }}>Your patterns</p>

      {cycleStats && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>Cycle length</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: cycleStats.irregular ? '#B45309' : '#6E3482' }}>
              {cycleStats.avg}d avg · {cycleStats.irregular ? 'irregular' : 'regular'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
            {[...cycleStats.history, cycleStats.avg].map((len, i, arr) => {
              const isAvg = i === arr.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isAvg ? '#6E3482' : '#8A6A9A' }}>{len}d</span>
                  <div style={{
                    width: '100%', height: `${(len / maxBar) * 72}px`, borderRadius: 10,
                    background: isAvg ? 'linear-gradient(180deg,#A56ABD,#6E3482)' : 'rgba(165,106,189,0.28)',
                    boxShadow: isAvg ? '0 4px 14px rgba(110,52,130,0.35)' : 'none',
                    transition: 'height .5s cubic-bezier(.34,1.4,.64,1)',
                  }} />
                  <span style={{ fontSize: 9, color: '#A99BB5', fontWeight: 600 }}>{isAvg ? 'avg' : `#${i + 1}`}</span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#8A6A9A' }}>
            Period ~{cycleStats.periodAvg} days · based on your last {cycleStats.history.length} cycle{cycleStats.history.length === 1 ? '' : 's'}
          </p>
        </div>
      )}

      {symptoms.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>Most common symptoms</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {symptoms.map((s) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{s.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1C0B2E', width: 100 }}>{s.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(165,106,189,0.15)', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / maxSym) * 100}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#A56ABD,#6E3482)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8A6A9A', width: 34, textAlign: 'right' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phaseRows.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>Mood &amp; energy by phase</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {phaseRows.map((p) => {
              const m = PHASE_META[p.phase];
              return (
                <div key={p.phase} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{m.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C0B2E', width: 78 }}>{m.label}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: '#6E3482', fontWeight: 600 }}>{p.topMood ?? '—'}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2, 3].map((d) => (
                      <span key={d} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: p.energy != null && d <= Math.round(p.energy) ? '#6E3482' : 'rgba(165,106,189,0.25)',
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#A99BB5' }}>● energy level · top mood per phase</p>
        </div>
      )}

      {(bbtTrend.length >= 3 || weightTrend.length >= 3) && (
        <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>Trends</p>
          {bbtTrend.length >= 3 && (
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#6E3482' }}>🌡️ Basal body temperature</p>
              <TrendChart points={bbtTrend} unit="°C" decimals={2} />
            </div>
          )}
          {weightTrend.length >= 3 && (
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#6E3482' }}>⚖️ Weight</p>
              <TrendChart points={weightTrend} unit=" kg" decimals={1} />
            </div>
          )}
        </div>
      )}

      {correlations.length > 0 && (
        <div className="glass-card tint-purple" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>What we&apos;re noticing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {correlations.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#49225B', lineHeight: 1.5 }}>
                <span>✨</span><span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: '0 2px', fontSize: 11, color: '#A99BB5' }}>
        From {loggedDays} logged {loggedDays === 1 ? 'day' : 'days'}. The more you log, the sharper these get.
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [phase, setPhase] = useState<Phase>('follicular');
  const [dayOfCycle, setDayOfCycle] = useState(1);
  const [data, setData] = useState<BloomData | null>(null);
  const [openScience, setOpenScience] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLog, setHasLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadRecs(log: DayLog, p: Phase) {
    // Cache key: date + phase + core symptom fields (mood/energy/cramps).
    // Rebuilds only when something meaningful changes, not on every tab visit.
    const cacheKey = `bloom_recs_${log.date}_${p}_${log.mood}_${log.energy}_${log.cramps}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setRecs(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {}
    }

    const rec = await fetch('/api/recommendations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: p, log }),
    }).then((r) => r.json());

    try { localStorage.setItem(cacheKey, JSON.stringify(rec)); } catch {}
    setRecs(rec);
    setLoading(false);
  }

  function applyPhase(d: BloomData) {
    const cp = getCurrentPhase(d);
    setPhase(cp.phase); setDayOfCycle(cp.dayOfCycle);
    return cp.phase;
  }

  useEffect(() => {
    const todayStr = appDayKey();

    // Show cached data immediately — patterns render from history, no network wait.
    const cached = sanitize(loadData());
    setData(cached);
    applyPhase(cached);
    const cachedLog = cached.logs.find((l) => l.date === todayStr);

    if (!cachedLog) {
      setHasLog(false);
      setLoading(false);
      fetchFromSheet().then((d) => {
        setData(d);
        const p = applyPhase(d);
        const sheetLog = d.logs.find((l) => l.date === todayStr);
        if (sheetLog) { setHasLog(true); setLoading(true); loadRecs(sheetLog, p); }
      });
      return;
    }

    // Have a local log — show spinner, fetch fresh data + recs
    setHasLog(true);
    setRecs(null);
    fetchFromSheet().then((d) => {
      setData(d);
      const p = applyPhase(d);
      const log = d.logs.find((l) => l.date === todayStr) ?? cachedLog;
      loadRecs(log, p);
    });
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const insights = useMemo(() => (data ? computeInsights(data) : null), [data]);
  const meta = PHASE_META[phase as keyof typeof PHASE_META];

  if (loading) return (
    <>
      <TopBar title="Reports" />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <IOSSpinner size={44} />
          <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#8A6A9A' }}>Building your report…</p>
        </div>
      </div>
    </>
  );

  if (!hasLog) return (
    <>
      <TopBar title="Reports" />
      {insights?.enough ? (
        <div style={{ padding: '8px 16px 24px' }}>
          {insights && <Patterns insights={insights} />}
          <div className="glass-card tint-purple anim-rise" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1C0B2E', lineHeight: 1.5 }}>Log today to unlock personalized recommendations.</span>
            <button onClick={() => setShowLog(true)} style={{
              padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
              fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-outfit)',
            }}>Log now →</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
          <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>No log for today</p>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#8A6A9A', lineHeight: 1.6, maxWidth: 260 }}>
            Log how you&apos;re feeling to unlock personalized reports and recommendations.
          </p>
          <button onClick={() => setShowLog(true)} style={{
            padding: '14px 32px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
            fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-outfit)',
            boxShadow: '0 8px 24px rgba(110,52,130,0.35)',
          }}>Log now →</button>
        </div>
      )}
      <LogSheet open={showLog} onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); setRefreshKey((k) => k + 1); }} />
    </>
  );

  return (
    <>
      <TopBar title="Reports" />
      <div style={{ padding: '8px 16px 24px' }}>
        <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A' }}>Insights for {meta.label} · Day {dayOfCycle}</p>
          <span style={{ fontSize: 28 }}>{meta.emoji}</span>
        </div>

        {/* Phase banner */}
        <div className="anim-float shimmer-host" style={{
          borderRadius: 24, padding: 18, marginBottom: 16,
          background: 'linear-gradient(135deg,#6E3482,#49225B)',
          boxShadow: '0 10px 36px rgba(110,52,130,0.30)', color: '#fff',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(255,255,255,0.55)' }}>CURRENT PHASE</p>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{meta.emoji} {meta.label} Phase</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{recs?.phaseDescription ?? meta.description}</p>
        </div>

        {insights?.enough && <Patterns insights={insights} />}

        {/* Recommendation cards */}
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {REC_CARDS.map(({ key, emoji, label, tint, border, color }) => {
            const d = recs![key as keyof Recommendations] as { text: string; science: string };
            const isOpen = openScience === key;
            return (
              <div key={key} className="glass-card" style={{ background: tint, borderColor: border, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color }}>{label.toUpperCase()}</span>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#1C0B2E', lineHeight: 1.6 }}>{d.text}</p>
                <button onClick={() => setOpenScience(isOpen ? null : key)} className="liquid-pill" style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#6E3482',
                  cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                }}>
                  {isOpen ? '▲ Hide science' : '▼ Why this works'}
                </button>
                {isOpen && (
                  <div className="anim-rise" style={{
                    marginTop: 10, padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.55)', borderLeft: '3px solid #A56ABD',
                    fontSize: 12.5, fontStyle: 'italic', color: '#6E3482', lineHeight: 1.6,
                  }}>{d.science}</div>
                )}
              </div>
            );
          })}
        </div>

        <Link href="/read" style={{ textDecoration: 'none' }}>
          <div className="glass-card tint-purple anim-rise" style={{ padding: '14px 18px', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Learn more about the {meta.label} phase</span>
            </div>
            <span style={{ color: '#A56ABD' }}>›</span>
          </div>
        </Link>
      </div>
    </>
  );
}
