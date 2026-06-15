'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export default function InfoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const youLog = ['Period start & end', 'Flow & cramps', 'Mood & energy', 'Bloating & sleep', 'Cravings'];
  const youGet = [
    { icon: '🌙', t: 'Your phase & cycle day',       s: 'Adapts to your real period & cycle length' },
    { icon: '🗓', t: 'Period & fertile predictions',  s: 'A date range in PCOS mode too' },
    { icon: '✅', t: 'Daily focus tasks',             s: 'Tailored to your phase & today\'s symptoms' },
    { icon: '📊', t: 'Science-backed reports',        s: 'Food, movement & self-care per phase' },
    { icon: '📅', t: 'Period length tracking',        s: 'Log end date — improves all predictions' },
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="About Bloom" className="liquid-pill" style={{
        width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#6E3482" strokeWidth="1.8" />
          <line x1="12" y1="11" x2="12" y2="16.5" stroke="#6E3482" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="7.8" r="1.1" fill="#6E3482" />
        </svg>
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(28,11,46,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'rise .2s ease both',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 448, maxHeight: '88vh',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -10px 48px rgba(110,52,130,0.22)', animation: 'floatIn .3s cubic-bezier(.22,.8,.3,1) both',
          }}>

            {/* ── Sticky header ── */}
            <div style={{
              flexShrink: 0,
              padding: '16px 20px 14px',
              borderBottom: '1px solid rgba(165,106,189,0.18)',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '28px 28px 0 0',
            }}>
              {/* Handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(165,106,189,0.3)', margin: '0 auto 14px' }} />

              {/* Back + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setOpen(false)} style={{
                  background: 'rgba(165,106,189,0.12)', border: 'none', borderRadius: 999,
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 5l-7 7 7 7" stroke="#6E3482" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>🌸</span>
                  <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>How Bloom works</p>
                </div>
                {/* spacer to keep title centered */}
                <div style={{ width: 34, flexShrink: 0 }} />
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px calc(24px + env(safe-area-inset-bottom))' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A', textAlign: 'center' }}>
                The more you log, the smarter it gets.
              </p>

              {/* You log */}
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: '#A56ABD', textTransform: 'uppercase' }}>You log</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {youLog.map((x) => (
                  <span key={x} className="pill" style={{ background: 'rgba(165,106,189,0.12)', padding: '7px 13px', fontSize: 12.5, fontWeight: 600, color: '#6E3482' }}>{x}</span>
                ))}
              </div>

              {/* You get */}
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: '#A56ABD', textTransform: 'uppercase' }}>You get</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {youGet.map((x) => (
                  <div key={x.t} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                    <span style={{ fontSize: 22 }}>{x.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{x.t}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{x.s}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Library */}
              <div className="glass-card tint-purple" style={{ padding: '14px 16px', marginBottom: 18 }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>📖 A library to learn from</p>
                <p style={{ margin: 0, fontSize: 12.5, color: '#6E3482', lineHeight: 1.55 }}>
                  Curated guides on all four cycle phases, cycle syncing, and PCOS — what it is and how to manage it with food & tracking.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setOpen(false)} style={{
                  flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(165,106,189,0.3)',
                  background: 'transparent', color: '#6E3482', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                }}>Got it</button>
                <button onClick={() => { setOpen(false); router.push('/read'); }} style={{
                  flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                  fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                  boxShadow: '0 6px 20px rgba(110,52,130,0.35)',
                }}>Explore articles →</button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
