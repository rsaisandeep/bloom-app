'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin, apiRegister, apiLoadData } from '@/lib/api';
import { saveData } from '@/lib/cycle';

const API_CONFIGURED = !!process.env.NEXT_PUBLIC_BLOOM_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMsg({ text: 'Fill in all fields.', err: true });
      return;
    }
    setLoading(true);
    setMsg({ text: 'Working…', err: false });

    const u = username.trim().toLowerCase();

    try {
      if (API_CONFIGURED) {
        // Google Sheets backend
        const fn = mode === 'register' ? apiRegister : apiLogin;
        const r = await fn(u, password);
        if (!r.ok) {
          setMsg({ text: r.error, err: true });
          setLoading(false);
          return;
        }
        // On login, pull existing data from sheet into localStorage
        if (mode === 'login') {
          const dataRes = await apiLoadData(u, password);
          if (dataRes.ok && dataRes.data) saveData(dataRes.data);
        }
        localStorage.setItem('bloom_session', JSON.stringify({ username: u, password }));
        router.push('/');
      } else {
        // localStorage fallback (no API URL set)
        await new Promise(r => setTimeout(r, 400));
        if (mode === 'register') {
          if (localStorage.getItem(`bloom_user_${u}`)) {
            setMsg({ text: 'Username already taken.', err: true });
            setLoading(false);
            return;
          }
          localStorage.setItem(`bloom_user_${u}`, JSON.stringify({ username: u, password }));
        } else {
          const stored = localStorage.getItem(`bloom_user_${u}`);
          if (!stored) { setMsg({ text: 'Account not found.', err: true }); setLoading(false); return; }
          if (JSON.parse(stored).password !== password) { setMsg({ text: 'Incorrect password.', err: true }); setLoading(false); return; }
        }
        localStorage.setItem('bloom_session', JSON.stringify({ username: u, password }));
        router.push('/');
      }
    } catch {
      setMsg({ text: 'Network error. Try again.', err: true });
      setLoading(false);
    }
  }

  const isReg = mode === 'register';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: `
        radial-gradient(900px 700px at 60% -20%, rgba(110,52,130,0.55), transparent 55%),
        radial-gradient(700px 600px at -10% 110%, rgba(165,106,189,0.35), transparent 50%),
        radial-gradient(500px 400px at 100% 80%, rgba(73,34,91,0.30), transparent 55%),
        linear-gradient(160deg, #2A0A3E 0%, #1C0B2E 100%)
      `,
      backgroundAttachment: 'fixed',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, lineHeight: 1 }}>🌸</div>
          <h1 style={{
            margin: '8px 0 4px',
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(135deg, #E7DBEF 0%, #A56ABD 50%, #6E3482 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'var(--font-outfit)',
          }}>BLOOM</h1>
          <p style={{ color: 'rgba(231,219,239,0.55)', fontSize: 14, margin: 0, letterSpacing: 0.5 }}>
            your intelligent cycle companion
          </p>
        </div>

        {/* Auth card */}
        <div style={{
          width: '100%',
          background: 'rgba(40,10,60,0.55)',
          border: '1px solid rgba(165,106,189,0.30)',
          borderRadius: 24,
          padding: '28px 24px',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.40), 0 0 0 0.5px rgba(165,106,189,0.15) inset',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(165,106,189,0.6), transparent)',
          }} />

          <h2 style={{ margin: '0 0 20px', color: '#F5EBFA', fontSize: 20, fontWeight: 700 }}>
            {isReg ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_name"
                autoComplete="username"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(165,106,189,0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#F5EBFA',
                  fontSize: 15,
                  outline: 'none',
                  fontFamily: 'var(--font-outfit)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(165,106,189,0.7)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(165,106,189,0.25)')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isReg ? 'new-password' : 'current-password'}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(165,106,189,0.25)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#F5EBFA',
                  fontSize: 15,
                  outline: 'none',
                  fontFamily: 'var(--font-outfit)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(165,106,189,0.7)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(165,106,189,0.25)')}
              />
            </div>

            {msg && (
              <p style={{
                margin: 0,
                fontSize: 13,
                color: msg.err ? '#FF8FAB' : 'rgba(231,219,239,0.6)',
                textAlign: 'center',
              }}>{msg.text}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: loading
                  ? 'rgba(110,52,130,0.4)'
                  : 'linear-gradient(135deg, #6E3482 0%, #A56ABD 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'var(--font-outfit)',
                letterSpacing: 0.3,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(110,52,130,0.50)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? '…' : isReg ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 13, color: 'rgba(231,219,239,0.45)' }}>
            {isReg ? 'Already have an account? ' : 'New here? '}
            <button
              onClick={() => { setMode(isReg ? 'login' : 'register'); setMsg(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#A56ABD',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'var(--font-outfit)',
              }}
            >
              {isReg ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
