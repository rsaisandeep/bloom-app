'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSettings, setPcosMode } from '@/lib/cycle';
import { fetchFromSheet } from '@/lib/data';

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pcos, setPcos] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('bloom_session');
    if (raw) { const { username: u } = JSON.parse(raw); setUsername(u || ''); }
    setPcos(!!getSettings().pcosMode);              // instant from cache
    fetchFromSheet().then(() => setPcos(!!getSettings().pcosMode)); // then sheet truth
  }, []);

  function togglePcos() {
    const next = !pcos;
    setPcos(next);
    setPcosMode(next); // persists to cache + syncs to sheet
  }

  function logout() {
    localStorage.removeItem('bloom_session');
    router.replace('/login');
  }

  const initial = username ? username[0].toUpperCase() : '🌸';

  return (
    <div style={{ minHeight: '100vh', padding: '32px 20px 20px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>
        Profile
      </h1>

      {/* Avatar */}
      <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: 28, fontWeight: 800, color: '#fff',
          boxShadow: '0 8px 24px rgba(110,52,130,0.35)',
        }}>
          {initial}
        </div>
        <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#1C0B2E' }}>{username}</p>
        <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A' }}>Bloom member</p>
      </div>

      {/* PCOS mode toggle */}
      <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>🩺</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>PCOS mode</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
                Softens predictions into a date range, since PCOS cycles vary in length.
              </p>
            </div>
          </div>
          {/* Switch */}
          <button onClick={togglePcos} role="switch" aria-checked={pcos} aria-label="PCOS mode" style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
            padding: 3, flexShrink: 0, position: 'relative',
            background: pcos ? 'linear-gradient(135deg,#6E3482,#A56ABD)' : 'rgba(165,106,189,0.25)',
            transition: 'background .25s cubic-bezier(.34,1.4,.64,1)',
            boxShadow: pcos ? '0 4px 12px rgba(110,52,130,0.3)' : 'none',
          }}>
            <span style={{
              display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transform: pcos ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
        {pcos && (
          <Link href="/read" style={{ textDecoration: 'none' }}>
            <p className="anim-rise" style={{
              margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: '#6E3482',
              padding: '8px 12px', borderRadius: 10, background: 'rgba(165,106,189,0.12)',
            }}>📖 Read our PCOS guides for food & tracking tips ›</p>
          </Link>
        )}
      </div>

      {/* Re-setup cycle */}
      <Link href="/onboarding" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🗓</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Update cycle setup</p>
              <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>Change period date or cycle length</p>
            </div>
          </div>
          <span style={{ color: '#A56ABD', fontSize: 16 }}>→</span>
        </div>
      </Link>

      {/* App info */}
      <div className="glass-card" style={{ padding: '4px 18px', marginBottom: 12 }}>
        {[
          { label: 'Data storage', value: 'Google Sheets + Local cache' },
          { label: 'Privacy', value: 'Your data stays yours' },
          { label: 'Version', value: '1.0.0' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < 2 ? '1px solid rgba(165,106,189,0.12)' : 'none',
          }}>
            <span style={{ fontSize: 14, color: '#49225B', fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 12, color: '#8A6A9A' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <button onClick={logout} style={{
        width: '100%', padding: '14px', borderRadius: 16,
        border: '1.5px solid rgba(220,38,38,0.3)',
        background: 'rgba(252,232,232,0.65)',
        color: '#dc2626', fontSize: 15, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'var(--font-outfit)',
        backdropFilter: 'blur(14px)', letterSpacing: 0.3,
      }}>
        Log out
      </button>
    </div>
  );
}
