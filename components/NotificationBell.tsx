'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { loadData } from '@/lib/cycle';
import { sanitize } from '@/lib/data';
import { appDayKey } from '@/lib/day';
import { listPartners, respondInvite, isViewer, type PartnerLink } from '@/lib/partners';

interface Notif { type: string; title: string; message: string; icon: string }

// Day-scoped dismissed set — shares the same sessionStorage key as the home
// screen's smart-notification card so dismissing in one place clears both.
function dismissedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(`bloom_notif_${appDayKey()}`);
    return raw ? new Set(raw.split(',').filter(Boolean)) : new Set();
  } catch { return new Set(); }
}

// Notifications mirroring the home screen's logic, newest-relevant first.
function getNotifs(): Notif[] {
  const data = sanitize(loadData());
  const logDates = new Set(data.logs.map((l) => l.date));
  const today = appDayKey();
  const dismissed = dismissedSet();
  const out: Notif[] = [];

  // 1. Streak at risk — a consecutive-day logging streak ending yesterday that
  //    today hasn't extended yet (same derivation as the home screen).
  if (!logDates.has(today)) {
    let streak = 0;
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!logDates.has(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    if (streak >= 1) out.push({
      type: 'logging_streak',
      title: 'Streak at risk',
      message: `Don't break your ${streak}-day streak — log today's symptoms.`,
      icon: '🔥',
    });
  }

  // 2. Refine today — same evening trigger as app/page.tsx: today is logged and
  //    it's past 5 PM, so invite refining the check-in.
  const todayLogged = logDates.has(today);
  if (todayLogged && new Date().getHours() >= 17) out.push({
    type: 'evening_refine',
    title: 'Refine today',
    message: 'How did today actually go? Tap your check-in to refine it.',
    icon: '🌙',
  });

  // 3. Try BBT tracking — only when the user has never logged a basal body
  //    temperature (no log carries a bbt value).
  const everLoggedBbt = data.logs.some((l) => typeof l.bbt === 'number');
  if (!everLoggedBbt) out.push({
    type: 'try_bbt',
    title: 'Try BBT tracking',
    message: 'Log your basal body temperature each morning for sharper ovulation predictions.',
    icon: '🌡️',
  });

  return out.filter((n) => !dismissed.has(n.type));
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [invites, setInvites] = useState<PartnerLink[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const refreshInvites = () => {
    listPartners().then(({ iCanView }) => setInvites(iCanView.filter((p) => p.status === 'pending')));
  };

  useEffect(() => {
    // Viewers don't track, so tracking nudges (streak, BBT, refine) never apply.
    const refresh = () => { setNotifs(isViewer() ? [] : getNotifs()); refreshInvites(); };
    refresh();
    window.addEventListener('bloom:refresh', refresh);
    return () => window.removeEventListener('bloom:refresh', refresh);
  }, []);

  async function respond(link: PartnerLink, accept: boolean) {
    await respondInvite(link.id, accept);
    refreshInvites();
  }

  function computePos() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos({ top: r.bottom + 8, left, width });
  }

  function openMenu() { computePos(); setOpen(true); }

  // Dismiss day-scoped, sharing the home card's sessionStorage key so a notif
  // dismissed here stays gone there too for the rest of the day.
  function dismiss(type: string) {
    try {
      const key = `bloom_notif_${appDayKey()}`;
      const cur = sessionStorage.getItem(key);
      const set = new Set(cur ? cur.split(',').filter(Boolean) : []);
      set.add(type);
      sessionStorage.setItem(key, [...set].join(','));
    } catch {}
    setNotifs(isViewer() ? [] : getNotifs());
  }

  // Reposition on resize/scroll while open so the dropdown tracks its button.
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', computePos);
    window.addEventListener('scroll', computePos, true);
    return () => {
      window.removeEventListener('resize', computePos);
      window.removeEventListener('scroll', computePos, true);
    };
  }, [open]);

  const count = notifs.length + invites.length;

  return (
    <>
      <button ref={btnRef} onClick={openMenu} aria-label="Notifications" className="liquid-pill" style={{
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
            <div style={{ flexShrink: 0, padding: '12px 16px 10px', borderBottom: '1px solid rgba(165,106,189,0.15)' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>Notifications</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 14px' }}>
              {/* Partner invites — accept/decline inline */}
              {invites.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: notifs.length ? 8 : 0 }}>
                  {invites.map((inv) => (
                    <div key={inv.id} className="glass-card" style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                      background: 'linear-gradient(135deg,rgba(110,52,130,0.16),rgba(165,106,189,0.08))',
                      borderColor: 'rgba(110,52,130,0.40)',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                      }}>👥</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1C0B2E' }}>Partner invite</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E3482', lineHeight: 1.4 }}>
                          {inv.name || inv.handle || 'Someone'} wants to share their cycle with you (read-only).
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => respond(inv, true)} style={{
                            padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: '#6E3482', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)',
                          }}>Accept</button>
                          <button onClick={() => respond(inv, false)} style={{
                            padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer',
                            color: '#dc2626', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-outfit)',
                          }}>Decline</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {count === 0 ? (
                <p style={{ margin: '16px 0', fontSize: 13, color: '#8A6A9A', textAlign: 'center', lineHeight: 1.5 }}>
                  You&apos;re all caught up 🎉
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifs.map((n) => (
                    <div key={n.type} className="glass-card" style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                      background: 'linear-gradient(135deg,rgba(165,106,189,0.16),rgba(110,52,130,0.08))',
                      borderColor: 'rgba(165,106,189,0.40)',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg,#A56ABD,#6E3482)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                      }}>{n.icon}</div>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1C0B2E' }}>{n.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E3482', lineHeight: 1.4 }}>{n.message}</p>
                      </div>
                      <button onClick={() => dismiss(n.type)} aria-label="Dismiss" style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#8A6A9A', fontSize: 14, padding: '2px 4px', lineHeight: 1,
                        fontFamily: 'var(--font-outfit)',
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
