'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentPhase, getPredictions, getAverageCycleLength, PHASE_META } from '@/lib/cycle';
import type { Recommendations } from '@/lib/matcher';
import { fetchFromSheet } from '@/lib/data';
import { appDayKey } from '@/lib/day';
import TopBar from '@/components/TopBar';
import LogSheet from '@/components/LogSheet';

const REC_CARDS = [
  { key: 'food',     emoji: '🥗', label: 'Food & Nutrition', tint: 'rgba(232,248,238,0.82)', border: 'rgba(100,200,130,0.3)', color: '#166534' },
  { key: 'exercise', emoji: '🏃', label: 'Movement',         tint: 'rgba(237,233,255,0.85)', border: 'rgba(165,106,189,0.3)', color: '#4c1d95' },
  { key: 'selfcare', emoji: '💆', label: 'Self-care',        tint: 'rgba(252,232,240,0.85)', border: 'rgba(200,100,140,0.3)', color: '#9d174d' },
];

export default function ReportsPage() {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [phase, setPhase] = useState('follicular');
  const [dayOfCycle, setDayOfCycle] = useState(1);
  const [cycleHistory, setCycleHistory] = useState<number[]>([]);
  const [avgLen, setAvgLen] = useState(28);
  const [openScience, setOpenScience] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLog, setHasLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setRecs(null);
    fetchFromSheet().then((data) => {
      const todayStr = appDayKey();
      const todayLog = data.logs.find((l) => l.date === todayStr);

      if (!todayLog) {
        setHasLog(false);
        setLoading(false);
        return;
      }

      setHasLog(true);
      const { phase: p, dayOfCycle: d } = getCurrentPhase(data);
      setPhase(p); setDayOfCycle(d);
      setAvgLen(getAverageCycleLength(data));
      const lengths = data.cycles.filter((c) => c.cycleLength).map((c) => c.cycleLength!);
      setCycleHistory(lengths.slice(-6));

      fetch('/api/recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: p, log: todayLog }),
      }).then((r) => r.json()).then((rec) => { setRecs(rec); setLoading(false); });
    });
  }, [refreshKey]);

  const meta = PHASE_META[phase as keyof typeof PHASE_META];

  // Loading spinner
  if (loading) return (
    <>
      <TopBar title="Reports" />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', animation: 'breathe 1.4s ease-in-out infinite' }}>🌸</div>
          <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#8A6A9A' }}>Building your report…</p>
        </div>
      </div>
    </>
  );

  // No log today — empty state
  if (!hasLog) return (
    <>
      <TopBar title="Reports" />
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
      <LogSheet
        open={showLog}
        onClose={() => setShowLog(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );

  const maxBar = Math.max(avgLen, ...cycleHistory, 1);

  return (
    <>
      <TopBar title="Reports" />
      <div style={{ padding: '8px 16px 24px' }}>
        {/* Phase subtitle */}
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
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{recs!.phaseDescription}</p>
        </div>

        {/* Cycle length chart */}
        {cycleHistory.length > 0 && (
          <div className="glass-card anim-rise" style={{ padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>Cycle length history</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
              {[...cycleHistory, avgLen].map((len, i, arr) => {
                const isPred = i === arr.length - 1;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isPred ? '#6E3482' : '#8A6A9A' }}>{len}d</span>
                    <div style={{
                      width: '100%', height: `${(len / maxBar) * 72}px`, borderRadius: 10,
                      background: isPred ? 'linear-gradient(180deg,#A56ABD,#6E3482)' : 'rgba(165,106,189,0.28)',
                      boxShadow: isPred ? '0 4px 14px rgba(110,52,130,0.35)' : 'none',
                      transition: 'height .5s cubic-bezier(.34,1.4,.64,1)',
                    }} />
                    <span style={{ fontSize: 9, color: '#A99BB5', fontWeight: 600 }}>{isPred ? 'avg' : `#${i + 1}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
