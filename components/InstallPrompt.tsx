'use client';
import { useEffect, useState } from 'react';
import { useInstall } from '@/lib/useInstall';
import { usePushNotifications } from '@/lib/usePushNotifications';

const DISMISS_KEY = 'bloom_install_dismissed';

export default function InstallPrompt() {
  const { canInstall, standalone, isIos, isIosSafari, installable, promptInstall } = useInstall();
  const { status: notifStatus, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [step, setStep] = useState<'install' | 'notify'>('install');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
  }, []);

  // Auto-dismiss notify step if push is not viable or already handled
  useEffect(() => {
    if (step !== 'notify') return;
    if (notifStatus === 'unsupported' || notifStatus === 'denied' || notifStatus === 'subscribed') {
      dismiss();
    }
  }, [step, notifStatus]);

  const showIosHint = isIos && !canInstall;
  const visibleInstall = installable && !dismissed && !standalone;

  if (step === 'install' && !visibleInstall) return null;
  if (step === 'notify' && dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }

  async function install() {
    const accepted = await promptInstall();
    if (accepted) {
      setStep('notify');
    } else {
      dismiss();
    }
  }

  async function enableNotifications() {
    await subscribe();
    dismiss();
  }

  const containerStyle: React.CSSProperties = {
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
  };

  if (step === 'notify') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Enable notifications</p>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.4 }}>
              Get reminders to log symptoms and period alerts.
            </p>
          </div>
          <button
            onClick={enableNotifications}
            disabled={notifStatus === 'loading'}
            style={{
              flexShrink: 0, padding: '9px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
              fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-outfit)',
              opacity: notifStatus === 'loading' ? 0.6 : 1,
            }}>Allow</button>
          <button onClick={dismiss} aria-label="Maybe later" style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 999, cursor: 'pointer',
            border: 'none', background: 'rgba(165,106,189,0.15)', color: '#6E3482', fontSize: 13,
          }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="Bloom" width={40} height={40} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Install Bloom</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.4 }}>
            {!showIosHint
              ? 'Add to your home screen for a full-screen, app-like experience.'
              : isIosSafari
                ? <>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.</>
                : <>Open this page in <strong>Safari</strong> to install.</>}
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
