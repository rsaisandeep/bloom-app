'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { setPeriodEnd, loadData } from '@/lib/cycle';
import { saveToSheet } from '@/lib/data';

function session() {
  try { return JSON.parse(localStorage.getItem('bloom_session') || '{}'); } catch { return {}; }
}

export default function PeriodEndModal({
  variant = 'card',
  onDone,
}: {
  variant?: 'card' | 'menu';
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [canLog, setCanLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { setMounted(true); }, []);

  function launch() {
    const data = loadData();
    const last = data.cycles.length > 0 ? data.cycles[data.cycles.length - 1] : null;
    if (last && !last.periodEndDate) {
      setStartDate(last.startDate);
      setDate(today);
      setCanLog(true);
    } else {
      setCanLog(false);
    }
    setOpen(true);
  }

  async function confirm() {
    setSaving(true);
    const uname = session().username || 'me';
    void uname; // used implicitly via loadData session
    setPeriodEnd(date);
    await saveToSheet(loadData());
    setSaving(false);
    setOpen(false);
    onDone?.();
  }

  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const trigger = variant === 'menu' ? (
    <span className="liquid-pill" style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '13px 16px', borderRadius: 18,
    }}>
      <span style={{ fontSize: 20 }}>🔴</span>
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Log period end</span>
        <span style={{ display: 'block', fontSize: 11, color: '#8A6A9A' }}>Mark when bleeding stopped</span>
      </span>
    </span>
  ) : (
    <span className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔴</span>
        <span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Log period end</span>
          <span style={{ display: 'block', fontSize: 12, color: '#8A6A9A' }}>Started {startDate ? fmt(startDate) : '…'}</span>
        </span>
      </span>
      <span style={{ color: '#A56ABD', fontSize: 16 }}>›</span>
    </span>
  );

  return (
    <>
      <button onClick={launch} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        width: '100%', textAlign: 'left', fontFamily: 'var(--font-outfit)',
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

            {!canLog ? (
              <>
                <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>No active period</p>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#8A6A9A' }}>
                  Log your period end once a period has started and hasn&apos;t been marked as ended yet.
                </p>
                <button onClick={() => setOpen(false)} style={{
                  width: '100%', padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                  background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                }}>Close</button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>When did your period end?</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#8A6A9A' }}>
                  Started {fmt(startDate)}.
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A' }}>Pick the last day of bleeding.</p>
                <input
                  type="date"
                  min={startDate}
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(165,106,189,0.3)', borderRadius: 14, padding: '14px 16px',
                    fontSize: 16, color: '#1C0B2E', fontFamily: 'var(--font-outfit)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setOpen(false)} style={{
                    flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                    background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>Cancel</button>
                  <button onClick={confirm} disabled={saving} style={{
                    flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                    fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-outfit)',
                    boxShadow: '0 6px 20px rgba(110,52,130,0.35)', opacity: saving ? 0.7 : 1,
                  }}>{saving ? 'Saving…' : 'Confirm'}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
