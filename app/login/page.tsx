'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin, apiLoginByUsername, apiRegister, HANDLE_RE } from '@/lib/api';
import { fetchFromSheet } from '@/lib/data';
import { setAccountType } from '@/lib/partners';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [asViewer, setAsViewer] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isReg) {
      if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
        setMsg({ text: 'Fill in all fields.', err: true });
        return;
      }
      if (!HANDLE_RE.test(username.trim().toLowerCase())) {
        setMsg({ text: 'Username must be 3–20 letters, numbers or underscores.', err: true });
        return;
      }
    } else if (!identifier.trim() || !password.trim()) {
      setMsg({ text: 'Fill in all fields.', err: true });
      return;
    }
    setLoading(true);
    setMsg({ text: 'Working…', err: false });

    try {
      if (isReg) {
        const r = await apiRegister(name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), password);
        if (!r.ok) { setMsg({ text: r.error ?? 'Something went wrong.', err: true }); setLoading(false); return; }
        if (r.session) {
          // Email confirmation disabled — already signed in. Celebrate, then go.
          setMsg({ text: '🌸 Hurray! You’ve registered with Bloom', err: false });
          setTimeout(() => router.push('/onboarding'), 1500);
        } else {
          setMsg({ text: 'Account created! Check your email to verify before logging in.', err: false });
          setLoading(false);
        }
      } else {
        // Branch on the identifier: an "@" means email, otherwise username.
        const id = identifier.trim().toLowerCase();
        const r = id.includes('@') ? await apiLogin(id, password) : await apiLoginByUsername(id, password);
        if (!r.ok) { setMsg({ text: r.error ?? 'Something went wrong.', err: true }); setLoading(false); return; }
        await fetchFromSheet();
        if (asViewer) {
          // Partner/view-only login: mark the account and go pick whose cycle to view.
          await setAccountType('viewer').catch(() => {});
          router.push(r.handle ? '/profile' : '/choose-username');
          return;
        }
        // Legacy accounts with no username yet pick one before continuing.
        router.push(r.handle ? '/' : '/choose-username');
      }
    } catch {
      setMsg({ text: 'Network error. Check your connection and try again.', err: true });
      setLoading(false);
    }
  }

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content') ?? '#EEE8F5';
    meta?.setAttribute('content', '#1C0B2E');
    return () => { meta?.setAttribute('content', prev); };
  }, []);

  const isReg = mode === 'register';

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(165,106,189,0.25)',
    borderRadius: 12,
    padding: '12px 14px',
    color: '#F5EBFA',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'var(--font-outfit)',
    transition: 'border-color 0.2s',
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(165,106,189,0.7)');
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(165,106,189,0.25)');

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
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

          <h2 style={{ margin: '0 0 20px', color: '#F5EBFA', fontSize: 20, fontWeight: 700, textAlign: 'center' }}>
            {isReg ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isReg && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
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
            )}
            {isReg && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. rose_26"
                  autoComplete="username"
                  autoCapitalize="none"
                  style={fieldStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            )}
            {isReg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={fieldStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Username or email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="username or you@example.com"
                  autoComplete="username"
                  autoCapitalize="none"
                  style={fieldStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            )}

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

            {!isReg && (
              <button type="button" onClick={() => setAsViewer(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
                padding: '2px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-outfit)',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: asViewer ? 'none' : '2px solid rgba(165,106,189,0.5)',
                  background: asViewer ? '#A56ABD' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {asViewer && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(231,219,239,0.75)' }}>Log in as partner (view only)</span>
              </button>
            )}

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
