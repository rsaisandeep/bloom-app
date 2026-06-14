'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadData, saveData } from '@/lib/cycle';
import { syncToSheet } from '@/lib/sync';

export default function OnboardingPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLen, setCycleLen] = useState('28');
  const [periodLen, setPeriodLen] = useState('5');
  const [error, setError] = useState('');

  function handleContinue() {
    if (!lastPeriod) { setError('Please enter when your last period started.'); return; }
    const data = loadData();
    const pLen = parseInt(periodLen) || 5;
    const startDate = new Date(lastPeriod);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + pLen - 1);
    data.cycles = [{ startDate: lastPeriod, endDate: endDate.toISOString().slice(0, 10) }];
    localStorage.setItem('bloom_cycle_length', cycleLen);
    localStorage.setItem('bloom_period_length', periodLen);
    saveData(data);
    syncToSheet();
    router.push('/');
  }

  const inputBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(165,106,189,0.25)',
    borderRadius: 12, padding: '12px 14px', color: '#1C0B2E', fontSize: 15,
    outline: 'none', fontFamily: 'var(--font-outfit)', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🌸</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>
          Set up your cycle
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: '#8A6A9A', lineHeight: 1.65 }}>
          Help us personalize your experience. It's OK if your last period was weeks ago — we'll calculate your current phase automatically.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Last period date */}
        <div className="glass-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>
            When did your last period start?
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A' }}>
            Pick a date — even if it was 2 or 3 weeks ago.
          </p>
          <input type="date" max={today} value={lastPeriod}
            onChange={e => { setLastPeriod(e.target.value); setError(''); }}
            style={inputBase} />
          {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
        </div>

        {/* Cycle length */}
        <div className="glass-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>
            How long is your typical cycle?
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#8A6A9A' }}>Average is 28 days (range: 21–40)</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <input type="range" min="21" max="40" value={cycleLen}
              onChange={e => setCycleLen(e.target.value)}
              style={{ flex: 1, accentColor: '#6E3482', height: 4 }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: '#6E3482', minWidth: 42, textAlign: 'right' }}>
              {cycleLen}d
            </span>
          </div>
        </div>

        {/* Period length */}
        <div className="glass-card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>
            How long does your period last?
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#8A6A9A' }}>Average is 5 days (range: 3–10)</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <input type="range" min="3" max="10" value={periodLen}
              onChange={e => setPeriodLen(e.target.value)}
              style={{ flex: 1, accentColor: '#6E3482', height: 4 }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: '#6E3482', minWidth: 42, textAlign: 'right' }}>
              {periodLen}d
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={handleContinue} style={{
          padding: '14px', borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 6px 24px rgba(110,52,130,0.35)',
          fontFamily: 'var(--font-outfit)', letterSpacing: 0.3,
        }}>
          Start tracking →
        </button>
        <button onClick={() => router.push('/')} style={{
          padding: '12px', borderRadius: 16, border: 'none',
          background: 'transparent', color: '#8A6A9A',
          fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
        }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
