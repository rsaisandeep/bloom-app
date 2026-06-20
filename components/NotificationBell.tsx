'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadData } from '@/lib/cycle';
import { sanitize } from '@/lib/data';
import { appDayKey } from '@/lib/day';

interface Notif { type: string; title: string; message: string; icon: string }

// "Streak at risk" — derived from the same streak logic as the home screen:
// a consecutive-day logging streak ending yesterday that today hasn't extended yet.
function getNotifs(): Notif[] {
  const data = sanitize(loadData());
  const logDates = new Set(data.logs.map((l) => l.date));
  const today = appDayKey();
  if (logDates.has(today)) return []; // streak already kept today

  // Count consecutive logged days ending yesterday.
  let streak = 0;
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!logDates.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  if (streak < 1) return [];
  return [{
    type: 'logging_streak',
    title: 'Streak at risk',
    message: `Don't break your ${streak}-day streak — log today's symptoms.`,
    icon: '🔥',
  }];
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    const refresh = () => setNotifs(getNotifs());
    refresh();
    window.addEventListener('bloom:refresh', refresh);
    return () => window.removeEventListener('bloom:refresh', refresh);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const count = notifs.length;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Notifications" className="liquid-pill" style={{
        position: 'relative', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="#6E3482" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="#6E3482" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: '50%',
            background: 'linear-gradient(135deg,#dc2626,#9d174d)', border: '1.5px solid #EEE8F5',
          }} />
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(28,11,46,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'rise .2s ease both',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 448, maxHeight: '70vh',
            display: 'flex', flexDirection: 'column',
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -10px 48px rgba(110,52,130,0.22)', animation: 'floatIn .3s cubic-bezier(.22,.8,.3,1) both',
          }}>
            <div style={{ flexShrink: 0, padding: '16px 20px 14px', borderBottom: '1px solid rgba(165,106,189,0.18)' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(165,106,189,0.3)', margin: '0 auto 14px' }} />
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C0B2E', textAlign: 'center' }}>Notifications</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }}>
              {count === 0 ? (
                <p style={{ margin: '20px 0', fontSize: 13.5, color: '#8A6A9A', textAlign: 'center', lineHeight: 1.5 }}>
                  You&apos;re all caught up 🎉
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {notifs.map((n) => (
                    <div key={n.type} className="glass-card" style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: 'linear-gradient(135deg,rgba(165,106,189,0.16),rgba(110,52,130,0.08))',
                      borderColor: 'rgba(165,106,189,0.40)',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                        background: 'linear-gradient(135deg,#A56ABD,#6E3482)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                      }}>{n.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>{n.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E3482', lineHeight: 1.4 }}>{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
