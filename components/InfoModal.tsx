'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

export default function InfoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 8, left, width });
    }
    setOpen(true);
  }

  // Reposition on resize/scroll while open so the dropdown tracks its button.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(340, window.innerWidth - 24);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos({ top: r.bottom + 8, left, width });
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const youLog = ['Period start & end', 'Flow & cramps', 'Mood & energy', 'BBT & cervical mucus', 'Sleep & cravings', 'Symptoms & ovulation'];
  const youGet = [
    { icon: '🌅', t: 'Morning & evening check-ins',  s: 'Phase-aware fields shown at the right time of day' },
    { icon: '🌙', t: 'Your phase & cycle day',       s: 'Adapts to your real period & cycle length — the app even themes to your phase' },
    { icon: '🗓', t: 'Period & fertile predictions',  s: 'A date range in PCOS mode too' },
    { icon: '✅', t: 'Today’s focus tasks',           s: 'Food, movement & self-care tuned to your phase and goals' },
    { icon: '📊', t: 'Reports & recommendations',    s: 'Your patterns, trends and per-phase guidance' },
    { icon: '👀', t: 'Partner mode',                 s: 'Share a read-only view with your partner — and conceive support tasks they can tick off' },
    { icon: '📖', t: 'Curated article library',      s: 'Guides on phases, conditions, fertility & more' },
  ];

  return (
    <>
      <button ref={btnRef} onClick={openMenu} aria-label="About Bloom" className="liquid-pill" style={{
        width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#6E3482" strokeWidth="1.8" />
          <line x1="12" y1="11" x2="12" y2="16.5" stroke="#6E3482" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="7.8" r="1.1" fill="#6E3482" />
        </svg>
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 500 }} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 501,
            maxHeight: 'calc(100dvh - 80px)', display: 'flex', flexDirection: 'column',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: 18, border: '1px solid rgba(165,106,189,0.18)',
            boxShadow: '0 14px 44px rgba(110,52,130,0.24)',
            animation: 'rise .16s ease both',
          }}>
            <button onClick={() => setOpen(false)} aria-label="Close" className="liquid-pill" style={{
              position: 'absolute', top: 10, right: 10, zIndex: 2,
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color: '#8A6A9A', fontFamily: 'var(--font-outfit)',
            }}>✕</button>
            <div style={{ flexShrink: 0, padding: '14px 44px 10px 16px', borderBottom: '1px solid rgba(165,106,189,0.15)' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>🌸 How Bloom works</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A' }}>The more you log, the smarter it gets.</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: '#A56ABD', textTransform: 'uppercase' }}>You log</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {youLog.map((x) => (
                  <span key={x} className="pill" style={{ background: 'rgba(165,106,189,0.12)', padding: '6px 11px', fontSize: 12, fontWeight: 600, color: '#6E3482' }}>{x}</span>
                ))}
              </div>

              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: '#A56ABD', textTransform: 'uppercase' }}>You get</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {youGet.map((x) => (
                  <div key={x.t} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 20 }}>{x.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1C0B2E' }}>{x.t}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11.5, color: '#8A6A9A' }}>{x.s}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => { setOpen(false); router.push('/read'); }} style={{
                width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                boxShadow: '0 6px 20px rgba(110,52,130,0.35)',
              }}>Explore articles →</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
