'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiSetHandle, HANDLE_RE } from '@/lib/api';

export default function ChooseUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = username.trim().toLowerCase();
    if (!HANDLE_RE.test(h)) {
      setMsg({ text: 'Username must be 3–20 letters, numbers or underscores.', err: true });
      return;
    }
    setLoading(true);
    setMsg({ text: 'Saving…', err: false });
    const r = await apiSetHandle(h);
    if (!r.ok) { setMsg({ text: r.error ?? 'Something went wrong.', err: true }); setLoading(false); return; }
    router.push('/');
  }

  const fieldStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(165,106,189,0.25)',
    borderRadius: 12, padding: '12px 14px', color: '#F5EBFA', fontSize: 15,
    outline: 'none', fontFamily: 'var(--font-outfit)', transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      background: `
        radial-gradient(900px 700px at 60% -20%, rgba(110,52,130,0.55), transparent 55%),
        radial-gradient(700px 600px at -10% 110%, rgba(165,106,189,0.35), transparent 50%),
        linear-gradient(160deg, #2A0A3E 0%, #1C0B2E 100%)`,
      backgroundAttachment: 'fixed',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>🌸</div>
          <h1 style={{ margin: '10px 0 4px', fontSize: 24, fontWeight: 800, color: '#F5EBFA', textAlign: 'center' }}>Pick a username</h1>
          <p style={{ color: 'rgba(231,219,239,0.55)', fontSize: 14, margin: 0 }}>
            You can use it to log in instead of your email.
          </p>
        </div>

        <div style={{
          width: '100%', background: 'rgba(40,10,60,0.55)', border: '1px solid rgba(165,106,189,0.30)',
          borderRadius: 24, padding: '28px 24px', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.40)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: 'rgba(231,219,239,0.65)', fontSize: 13, fontWeight: 500 }}>Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="e.g. rose_26" autoComplete="username" autoCapitalize="none" autoFocus
                style={fieldStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(165,106,189,0.7)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(165,106,189,0.25)')}
              />
            </div>

            {msg && (
              <p style={{ margin: 0, fontSize: 13, color: msg.err ? '#FF8FAB' : 'rgba(231,219,239,0.6)', textAlign: 'center' }}>
                {msg.text}
              </p>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 4, padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? 'rgba(110,52,130,0.4)' : 'linear-gradient(135deg, #6E3482 0%, #A56ABD 100%)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-outfit)', letterSpacing: 0.3,
            }}>
              {loading ? '…' : 'Save & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
