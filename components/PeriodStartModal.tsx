'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { addPeriodStart, editPeriodStart, setPeriodEnd, clearPeriodEnd, deleteCycle, loadData } from '@/lib/cycle';
import { fetchFromSheet, saveToSheet } from '@/lib/data';

function session() {
  try { return JSON.parse(localStorage.getItem('bloom_session') || '{}'); } catch { return {}; }
}

function XBtn({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'rgba(165,106,189,0.15)', border: 'none', borderRadius: '50%',
        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#6E3482', fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
      }}
    >✕</button>
  );
}

export default function PeriodStartModal({
  label = 'Log period',
  variant = 'card',
  onDone,
}: {
  label?: string;
  variant?: 'card' | 'banner-cta' | 'menu';
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { setMounted(true); }, []);

  function launch() {
    setFetching(true);
    setStartDate('');
    setEndDate('');
    setActiveId(null);
    setOpen(true);
    fetchFromSheet().then((fresh) => {
      if (fresh.cycles.length > 0) {
        const last = fresh.cycles[fresh.cycles.length - 1];
        setActiveId(last.id);
        setStartDate(last.startDate ?? '');
        setEndDate(last.periodEndDate ?? '');
      } else {
        setStartDate(today);
      }
      setFetching(false);
    });
  }

  async function confirm() {
    setSaving(true);
    const uname = session().username || 'me';

    if (startDate) {
      if (activeId) {
        editPeriodStart(activeId, startDate, uname);
      } else {
        addPeriodStart(startDate, uname);
      }
      if (endDate && endDate >= startDate) {
        setPeriodEnd(endDate);
      } else {
        clearPeriodEnd(); // clears any previously saved end date
      }
    } else if (activeId) {
      // start date was explicitly deleted — remove the whole cycle
      deleteCycle(activeId);
    }

    await saveToSheet(loadData());
    setSaving(false);
    setOpen(false);
    onDone?.();
  }

  const fmt = (s: string) =>
    s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(165,106,189,0.3)', borderRadius: 14,
    padding: '14px 44px 14px 16px',
    fontSize: 16, fontFamily: 'var(--font-outfit)', outline: 'none',
  };

  const trigger =
    variant === 'banner-cta' ? (
      <span style={{
        fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
        padding: '8px 14px', borderRadius: 999,
        background: 'linear-gradient(135deg,#dc2626,#9d174d)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
      }}>It started →</span>
    ) : variant === 'menu' ? (
      <span className="liquid-pill" style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '13px 16px', borderRadius: 18,
      }}>
        <span style={{ fontSize: 20 }}>🩸</span>
        <span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Log period</span>
          <span style={{ display: 'block', fontSize: 11, color: '#8A6A9A' }}>Start and end dates</span>
        </span>
      </span>
    ) : (
      <span className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🩸</span>
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{label}</span>
            <span style={{ display: 'block', fontSize: 12, color: '#8A6A9A' }}>Log start and end dates</span>
          </span>
        </span>
        <span style={{ color: '#A56ABD', fontSize: 16 }}>›</span>
      </span>
    );

  return (
    <>
      <button onClick={launch} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        width: variant === 'banner-cta' ? 'auto' : '100%', textAlign: 'left', fontFamily: 'var(--font-outfit)',
      }}>
        {trigger}
      </button>

      {open && mounted && createPortal(
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(28,11,46,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'rise .2s ease both',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 448, background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '28px 28px 0 0', padding: '24px 20px calc(28px + env(safe-area-inset-bottom))',
            boxShadow: '0 -10px 48px rgba(110,52,130,0.22)', animation: 'floatIn .3s cubic-bezier(.22,.8,.3,1) both',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(165,106,189,0.3)', margin: '0 auto 18px' }} />

            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>
              {fetching ? 'Log your period' : activeId ? 'Update period dates' : 'Log your period'}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8A6A9A' }}>
              {fetching
                ? 'Loading your period data…'
                : activeId && startDate
                  ? `Started ${fmt(startDate)}. Update dates below.`
                  : 'Pick the start date. End date is optional.'}
            </p>

            {/* Period start */}
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#6E3482', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Period start
            </p>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type="date"
                max={today}
                value={startDate}
                disabled={fetching}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value > endDate) setEndDate('');
                }}
                style={{ ...inputStyle, color: startDate ? '#1C0B2E' : '#A99BB5', opacity: fetching ? 0.5 : 1 }}
              />
              {startDate && !fetching && <XBtn onClear={() => { setStartDate(''); setEndDate(''); }} />}
            </div>

            {/* Period end */}
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: '#6E3482', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Period end{' '}
              <span style={{ fontWeight: 500, color: '#A99BB5', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </p>
            <div style={{ position: 'relative', marginBottom: 22 }}>
              <input
                type="date"
                min={startDate || undefined}
                max={today}
                value={endDate}
                disabled={fetching || !startDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ ...inputStyle, color: endDate ? '#1C0B2E' : '#A99BB5', opacity: (fetching || !startDate) ? 0.5 : 1 }}
              />
              {endDate && !fetching && <XBtn onClear={() => setEndDate('')} />}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{
                flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-outfit)',
              }}>Cancel</button>
              <button onClick={confirm} disabled={saving || fetching} style={{
                flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                fontSize: 15, fontWeight: 800,
                cursor: (saving || fetching) ? 'default' : 'pointer', fontFamily: 'var(--font-outfit)',
                boxShadow: '0 6px 20px rgba(110,52,130,0.35)', opacity: (saving || fetching) ? 0.6 : 1,
              }}>{saving ? 'Saving…' : 'Confirm'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
