'use client';
import { useEffect, useState } from 'react';
import { useInstall } from '@/lib/useInstall';

const DISMISS_KEY = 'bloom_install_dismissed';

export default function InstallPrompt() {
  const { canInstall, standalone, isIos, installable, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(true); // hidden until the effect checks

  useEffect(() => {
    // Register the service worker (enables Android install + offline cache).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Session-scoped dismiss: hide only for this visit, then suggest again next
    // time they open in the browser. Standalone check (in the hook) stops it
    // inside the installed PWA.
    setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
  }, []);

  const showIosHint = isIos && !canInstall;
  const visible = installable && !dismissed && !standalone;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }

  async function install() {
    await promptInstall();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, margin: '0 auto',
      bottom: 'calc(86px + env(safe-area-inset-bottom))',
      width: 'calc(100% - 24px)', maxWidth: 424, zIndex: 250,
      boxSizing: 'border-box',
      background: 'rgba(250,246,252,0.96)',
      backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.85)', borderRadius: 22,
      boxShadow: '0 12px 40px rgba(110,52,130,0.28)',
      padding: '14px 16px', fontFamily: 'var(--font-outfit)',
      animation: 'rise .25s ease both',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="Bloom" width={40} height={40} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Install Bloom</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.4 }}>
            {showIosHint
              ? <>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</>
              : 'Add to your home screen for a full-screen, app-like experience.'}
          </p>
        </div>
        {!showIosHint && (
          <button onClick={install} style={{
            flexShrink: 0, padding: '9px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-outfit)',
          }}>Install</button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 999, cursor: 'pointer',
          border: 'none', background: 'rgba(165,106,189,0.15)', color: '#6E3482', fontSize: 13,
        }}>✕</button>
      </div>
    </div>
  );
}
