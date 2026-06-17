'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import PeriodStartModal from '@/components/PeriodStartModal';
import { apiLogout } from '@/lib/api';

export default function Hamburger({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function logout() {
    apiLogout(); // signs out of Supabase + clears app cache, then redirects to /login
  }

  const items = [
    { emoji: '🗓', label: 'Cycle setup', sub: 'Update period & length', onClick: () => { setOpen(false); router.push('/onboarding'); } },
    { emoji: '📖', label: 'Read', sub: 'Articles & guides', onClick: () => { setOpen(false); router.push('/read'); } },
    { emoji: '👤', label: 'Profile', sub: 'Your account', onClick: () => { setOpen(false); router.push('/profile'); } },
  ];

  return (
    <>
      {/* Trigger */}
      <button onClick={() => setOpen(true)} aria-label="Menu" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 8,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {[14, 20, 14].map((w, i) => (
          <div key={i} style={{ width: w, height: 2.4, background: '#1C0B2E', borderRadius: 2, alignSelf: 'flex-start' }} />
        ))}
      </button>

      {/* Overlay — portalled to document.body to escape TopBar's stacking context */}
      {open && mounted && createPortal(
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(28,11,46,0.34)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'rise .2s ease both',
        }}>
          {/* Panel */}
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: '78%', maxWidth: 320,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRight: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '8px 0 48px rgba(110,52,130,0.22)',
            padding: '28px 20px', display: 'flex', flexDirection: 'column',
            animation: 'slideIn .32s cubic-bezier(.22,.8,.3,1) both',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff',
                boxShadow: '0 6px 18px rgba(110,52,130,0.35)',
              }}>{username?.[0]?.toUpperCase() || '🌸'}</div>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>
                  {username ? username[0].toUpperCase() + username.slice(1) : 'Bloom'}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>Bloom member</p>
              </div>
            </div>

            {/* Items */}
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <PeriodStartModal variant="menu" onDone={() => setOpen(false)} />
              {items.map((it) => (
                <button key={it.label} onClick={it.onClick} className="liquid-pill" style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  padding: '13px 16px', borderRadius: 18, cursor: 'pointer',
                  fontFamily: 'var(--font-outfit)',
                }}>
                  <span style={{ fontSize: 20 }}>{it.emoji}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{it.label}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: '#8A6A9A' }}>{it.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Logout */}
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 18, marginTop: 14,
              border: '1.5px solid rgba(220,38,38,0.28)',
              background: 'rgba(252,232,232,0.6)', color: '#dc2626',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Log out
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
