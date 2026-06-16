'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildSummary, type DoctorSummary } from '@/lib/export';
import { loadData } from '@/lib/cycle';
import { sanitize } from '@/lib/data';

const fmt = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function DoctorSummaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [summary, setSummary] = useState<DoctorSummary | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setSummary(buildSummary(sanitize(loadData()))); }, [open]);

  if (!mounted || !open || !summary) return null;

  const s = summary;
  const label = { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#8A6A9A', textTransform: 'uppercase' as const, margin: '0 0 4px' };
  const val = { fontSize: 18, fontWeight: 800, color: '#1C0B2E', margin: 0 };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(28,11,46,0.55)', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
      {/* Only the summary sheet survives print() — hide everything else. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #bloom-summary, #bloom-summary * { visibility: visible !important; }
        #bloom-summary { position: absolute !important; top: 0; left: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
        .no-print { display: none !important; }
      }`}</style>

      <div style={{ width: '100%', maxWidth: 460, margin: '24px 0', alignSelf: 'flex-start' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)' }}>‹ Close</button>
          <button onClick={() => window.print()} style={{
            padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: '#fff', color: '#6E3482', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-outfit)',
          }}>Print / Save PDF</button>
        </div>

        <div id="bloom-summary" style={{ background: '#fff', borderRadius: 20, padding: 28, margin: '0 12px', color: '#1C0B2E', fontFamily: 'var(--font-outfit)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #6E3482', paddingBottom: 12, marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#6E3482' }}>🌸 Cycle Summary</h1>
            <span style={{ fontSize: 12, color: '#8A6A9A' }}>Generated {fmt(s.generatedOn)}</span>
          </div>

          {s.dateRange && (
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8A6A9A' }}>
              Tracking period: {fmt(s.dateRange.from)} – {fmt(s.dateRange.to)} · {s.loggedDays} days logged
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div><p style={label}>Avg cycle length</p><p style={val}>{s.avgCycle} days</p>
              {s.cycleRange && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A' }}>range {s.cycleRange.min}–{s.cycleRange.max}d</p>}</div>
            <div><p style={label}>Avg period length</p><p style={val}>{s.avgPeriod} days</p></div>
            <div><p style={label}>Cycles tracked</p><p style={val}>{s.cycleCount}</p></div>
            <div><p style={label}>Regularity</p><p style={{ ...val, color: s.regularity.irregular ? '#B45309' : '#166534' }}>{s.regularity.irregular ? 'Irregular' : 'Regular'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A' }}>±{s.regularity.stdDev}d variation</p></div>
          </div>

          {s.recentCycles.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ ...label, marginBottom: 8 }}>Recent cycles</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ color: '#8A6A9A', textAlign: 'left' }}>
                  <th style={{ padding: '4px 0', fontWeight: 700 }}>Start</th>
                  <th style={{ padding: '4px 0', fontWeight: 700 }}>Cycle</th>
                  <th style={{ padding: '4px 0', fontWeight: 700 }}>Period</th>
                </tr></thead>
                <tbody>
                  {s.recentCycles.map((c) => (
                    <tr key={c.start} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '6px 0' }}>{fmt(c.start)}</td>
                      <td style={{ padding: '6px 0' }}>{c.cycleLength ? `${c.cycleLength}d` : '—'}</td>
                      <td style={{ padding: '6px 0' }}>{c.periodLength ? `${c.periodLength}d` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {s.topSymptoms.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ ...label, marginBottom: 8 }}>Most common symptoms</p>
              {s.topSymptoms.map((sym) => (
                <div key={sym.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                  <span>{sym.emoji} {sym.label}</span>
                  <span style={{ color: '#8A6A9A', fontWeight: 700 }}>{sym.pct}% of days</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ margin: '20px 0 0', paddingTop: 12, borderTop: '1px solid #eee', fontSize: 11, color: '#A99BB5', lineHeight: 1.5 }}>
            Generated by Bloom from self-reported data. For informational use in a clinical conversation — not a medical diagnosis.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
