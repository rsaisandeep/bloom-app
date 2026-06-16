'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSettings, setPcosMode, setPaused, loadData, deleteCycle, isLikelySkipped, type Cycle } from '@/lib/cycle';
import { fetchFromSheet } from '@/lib/data';
import TopBar from '@/components/TopBar';
import { apiLogout } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pcos, setPcos] = useState(false);
  const [paused, setPausedState] = useState(false);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  function syncLocal() {
    setPcos(!!getSettings().pcosMode);
    setPausedState(!!getSettings().paused);
    setCycles([...loadData().cycles].reverse()); // newest first
  }

  useEffect(() => {
    const u = localStorage.getItem('bloom_username');
    if (u) setUsername(u);
    syncLocal();                          // instant from cache
    fetchFromSheet().then(syncLocal);     // then sheet truth
  }, []);

  function togglePcos() {
    const next = !pcos;
    setPcos(next);
    setPcosMode(next); // persists to cache + syncs to sheet
  }

  function togglePaused() {
    const next = !paused;
    setPausedState(next);
    setPaused(next);
  }

  function removeCycle(id: string) {
    deleteCycle(id);
    syncLocal();
  }

  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  async function logout() {
    await apiLogout();
    router.replace('/login');
  }

  const initial = username ? username[0].toUpperCase() : '🌸';

  return (
    <><TopBar />
    <div style={{ minHeight: '100vh', padding: '8px 20px 20px' }}>
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

      {/* Pause tracking toggle */}
      <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>⏸️</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Pause tracking</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
                For pregnancy or a break — stops predictions & reminders. Logging a period resumes it.
              </p>
            </div>
          </div>
          <button onClick={togglePaused} role="switch" aria-checked={paused} aria-label="Pause tracking" style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
            padding: 3, flexShrink: 0, position: 'relative',
            background: paused ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'rgba(165,106,189,0.25)',
            transition: 'background .25s cubic-bezier(.34,1.4,.64,1)',
            boxShadow: paused ? '0 4px 12px rgba(217,119,6,0.3)' : 'none',
          }}>
            <span style={{
              display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transform: paused ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
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

      {/* Cycle history */}
      {cycles.length > 0 && (
        <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Cycle history</p>
          {cycles.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: i < cycles.length - 1 ? '1px solid rgba(165,106,189,0.12)' : 'none',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>
                  {fmt(c.startDate)}
                  {i === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#6E3482', marginLeft: 8 }}>current</span>}
                  {isLikelySkipped(c.cycleLength) && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginLeft: 8 }}>⚠ skipped?</span>}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
                  {c.cycleLength ? `${c.cycleLength}-day cycle` : 'in progress'}
                  {c.periodLength ? ` · ${c.periodLength}-day period` : ''}
                </p>
              </div>
              <button onClick={() => removeCycle(c.id)} aria-label="Delete cycle" style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(252,232,232,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* App info */}
      <div className="glass-card" style={{ padding: '4px 18px', marginBottom: 12 }}>
        {[
          { label: 'Data storage', value: 'Supabase + Local cache' },
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
    </>
  );
}
