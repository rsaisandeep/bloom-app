'use client';
import { useEffect, useState, useCallback } from 'react';

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'unlocked' | 'locked'>('checking');

  const authenticate = useCallback(async () => {
    setStatus('checking');
    const credIdB64 = localStorage.getItem('bloom_biometric_credential_id');
    if (!credIdB64) {
      localStorage.removeItem('bloom_biometric_enabled');
      setStatus('unlocked');
      return;
    }
    try {
      const credIdBytes = Uint8Array.from(atob(credIdB64), (c) => c.charCodeAt(0));
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: window.location.hostname,
          allowCredentials: [{ id: credIdBytes, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      sessionStorage.setItem('bloom_biometric_verified', 'true');
      setStatus('unlocked');
    } catch {
      setStatus('locked');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('bloom_biometric_verified') === 'true') {
      setStatus('unlocked');
      return;
    }
    const enabled = localStorage.getItem('bloom_biometric_enabled') === 'true';
    if (!enabled || !navigator.credentials) {
      setStatus('unlocked');
      return;
    }
    authenticate();
  }, [authenticate]);

  if (status === 'unlocked') return <>{children}</>;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(180deg, #1C0B2E 0%, #2D0F3D 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>
        {status === 'locked' ? '🔒' : '✨'}
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#fff', textAlign: 'center' }}>
        {status === 'locked' ? 'Bloom is locked' : 'Bloom'}
      </p>
      <p style={{ margin: '0 0 40px', fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.5 }}>
        {status === 'checking'
          ? 'Verifying your identity…'
          : 'Biometric verification failed or was cancelled.'}
      </p>
      {status === 'locked' && (
        <button onClick={authenticate} style={{
          padding: '14px 32px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
          color: '#fff', fontSize: 15, fontWeight: 800,
          fontFamily: 'var(--font-outfit)',
          boxShadow: '0 8px 24px rgba(110,52,130,0.45)',
        }}>
          Try again
        </button>
      )}
      {status === 'checking' && (
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(165,106,189,0.3)',
          borderTopColor: '#A56ABD',
          animation: 'spinSlow 0.8s linear infinite',
        }} />
      )}
    </div>
  );
}
