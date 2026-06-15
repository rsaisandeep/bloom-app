'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { addPeriodStart, editPeriodStart, getActivePeriodCycle, loadData } from '@/lib/cycle';

function session() {
  try { return JSON.parse(localStorage.getItem('bloom_session') || '{}'); } catch { return {}; }
}

// Logs (or back-dates) a period start. If a period is already active, shows it
// with an Edit affordance instead of adding a duplicate.
export default function PeriodStartModal({
  label = 'Log period start',
  variant = 'card',
  onDone,
}: {
  label?: string;
  variant?: 'card' | 'banner-cta' | 'menu';
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState<{ id: string; startDate: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  function launch() {
    const a = getActivePeriodCycle(loadData());
    setActive(a ? { id: a.id, startDate: a.startDate } : null);
    setEditing(!a);                       // no active period → go straight to add
    setDate(a ? a.startDate : today);
    setOpen(true);
  }

  function confirm() {
    const uname = session().username || 'me';
    if (active && editing) editPeriodStart(active.id, date, uname);
    else addPeriodStart(date, uname);
    setOpen(false);
    onDone?.();
  }

  const fmt = (s: string) => new Date(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
          <span style={{ display: 'block', fontSize: 11, color: '#8A6A9A' }}>Started today or earlier</span>
        </span>
      </span>
    ) : (
      <span className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🩸</span>
          <span>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{label}</span>
            <span style={{ display: 'block', fontSize: 12, color: '#8A6A9A' }}>Today or a past date</span>
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

      {open && typeof document !== 'undefined' && createPortal(
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

            {active && !editing ? (
              // Already logged → show it with Edit
              <>
                <div style={{ fontSize: 34, marginBottom: 8 }}>🩸</div>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>Period already logged</p>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: '#6E3482', fontWeight: 600 }}>
                  Started {fmt(active.startDate)}.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setOpen(false)} style={{
                    flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                    background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>Close</button>
                  <button onClick={() => setEditing(true)} style={{
                    flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                    fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                    boxShadow: '0 6px 20px rgba(110,52,130,0.35)',
                  }}>Edit date</button>
                </div>
              </>
            ) : (
              // Add or edit a start date
              <>
                <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>
                  {active ? 'Edit period start' : 'When did your period start?'}
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A' }}>Pick today, or back-date if it started earlier.</p>
                <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} style={{
                  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(165,106,189,0.3)', borderRadius: 14, padding: '14px 16px',
                  fontSize: 16, color: '#1C0B2E', fontFamily: 'var(--font-outfit)', outline: 'none',
                }} />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setOpen(false)} style={{
                    flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                    background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  }}>Cancel</button>
                  <button onClick={confirm} style={{
                    flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                    fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                    boxShadow: '0 6px 20px rgba(110,52,130,0.35)',
                  }}>Confirm</button>
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
