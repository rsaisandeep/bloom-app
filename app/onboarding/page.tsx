'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadData } from '@/lib/cycle';
import { saveToSheet } from '@/lib/data';

const CONDITIONS = [
  { id: 'none', label: 'None' },
  { id: 'pcos', label: 'PCOS' },
  { id: 'endometriosis', label: 'Endometriosis' },
  { id: 'thyroid', label: 'Thyroid condition' },
];

const BIRTH_CONTROLS = [
  { id: 'none', label: 'None / Not using' },
  { id: 'pill', label: 'Pill (combined)' },
  { id: 'mini-pill', label: 'Mini-pill (progestin-only)' },
  { id: 'iud-hormonal', label: 'Hormonal IUD' },
  { id: 'iud-copper', label: 'Copper IUD' },
  { id: 'implant', label: 'Implant' },
  { id: 'patch', label: 'Patch' },
  { id: 'ring', label: 'Vaginal ring' },
  { id: 'other', label: 'Other' },
];

const GOALS = [
  { id: 'track', emoji: '📅', label: 'Track my cycle', sub: 'Know where I am in my cycle' },
  { id: 'symptoms', emoji: '🩺', label: 'Manage symptoms', sub: 'PMS, cramps, mood swings' },
  { id: 'conceive', emoji: '🌱', label: 'Trying to conceive', sub: 'Fertility window tracking' },
  { id: 'wellness', emoji: '✨', label: 'General wellness', sub: 'Eat, move, and sleep better' },
];

const FEATURES = [
  { emoji: '🔮', title: 'Phase tracking', sub: 'Know your menstrual, follicular, ovulation and luteal phase in real time.' },
  { emoji: '📝', title: 'Daily logging', sub: 'Log mood, energy, cramps, sleep, flow and cravings in seconds.' },
  { emoji: '📊', title: 'Smart predictions', sub: 'Next period and ovulation predicted from your real cycle history.' },
  { emoji: '💡', title: 'Personalised tips', sub: 'Daily focus tasks tailored to your phase and today\'s symptoms.' },
  { emoji: '🤖', title: 'AI insights', sub: 'Wellness recommendations powered by your health data and cycle phase.' },
];

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(165,106,189,0.25)',
  borderRadius: 12, padding: '12px 14px', color: '#1C0B2E', fontSize: 15,
  outline: 'none', fontFamily: 'var(--font-outfit)', width: '100%', boxSizing: 'border-box',
};

export default function OnboardingPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Step 1
  const [age, setAge] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [birthControl, setBirthControl] = useState('none');
  const [goal, setGoal] = useState('');

  // Step 2
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLen, setCycleLen] = useState('28');
  const [periodLen, setPeriodLen] = useState('5');

  function toggleCondition(id: string) {
    if (id === 'none') { setConditions(['none']); return; }
    setConditions(prev => {
      const without = prev.filter(c => c !== 'none');
      return without.includes(id) ? without.filter(c => c !== id) : [...without, id];
    });
  }

  function goToStep2() {
    const a = parseInt(age);
    if (!age || isNaN(a) || a < 10 || a > 60) { setError('Please enter a valid age (10–60).'); return; }
    if (!goal) { setError('Please select your primary goal.'); return; }
    setError('');
    setStep(2);
  }

  function goToStep3() {
    if (!lastPeriod) { setError('Please enter when your last period started.'); return; }
    setError('');
    setStep(3);
  }

  async function handleFinish() {
    setSaving(true);
    const pLen = parseInt(periodLen) || 5;
    const cLen = parseInt(cycleLen) || 28;
    const uname = localStorage.getItem('bloom_username') || 'me';
    const data = loadData();

    if (lastPeriod) {
      const endDate = new Date(lastPeriod);
      endDate.setDate(endDate.getDate() + pLen - 1);
      data.cycles = [{
        id: `${uname}_${lastPeriod}`,
        startDate: lastPeriod,
        periodEndDate: endDate.toISOString().slice(0, 10),
        periodLength: pLen,
      }];
    }

    data.settings = {
      ...data.settings,
      defaultCycleLength: cLen,
      defaultPeriodLength: pLen,
      age: parseInt(age) || undefined,
      healthConditions: conditions.length ? conditions : ['none'],
      birthControl,
      goal,
      pcosMode: conditions.includes('pcos'),
      onboardingComplete: true,
    };

    await saveToSheet(data);
    router.push('/');
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '9px 16px', borderRadius: 999, border: `1.5px solid ${active ? '#6E3482' : 'rgba(165,106,189,0.3)'}`,
    background: active ? 'rgba(110,52,130,0.15)' : 'transparent',
    color: active ? '#6E3482' : '#49225B', fontSize: 14, fontWeight: active ? 700 : 500,
    cursor: 'pointer', fontFamily: 'var(--font-outfit)', transition: 'all .2s',
  });

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px 60px' }}>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            height: 6, borderRadius: 999,
            width: s === step ? 24 : 8,
            background: s <= step ? '#6E3482' : 'rgba(165,106,189,0.25)',
            transition: 'all .3s',
          }} />
        ))}
      </div>

      {/* ── Step 1: About you ── */}
      {step === 1 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>
              Tell us about you
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#8A6A9A', lineHeight: 1.65 }}>
              This helps Bloom personalise predictions and recommendations for your body.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Age */}
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>How old are you?</p>
              <input type="number" min="10" max="60" value={age} onChange={e => { setAge(e.target.value); setError(''); }}
                placeholder="e.g. 26" style={inputBase} />
            </div>

            {/* Health conditions */}
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>Any health conditions?</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A' }}>Select all that apply</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CONDITIONS.map(c => (
                  <button key={c.id} onClick={() => toggleCondition(c.id)}
                    style={pill(conditions.includes(c.id) || (c.id === 'none' && conditions.length === 0))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Birth control */}
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>Birth control</p>
              <select value={birthControl} onChange={e => setBirthControl(e.target.value)}
                style={{ ...inputBase, appearance: 'none', WebkitAppearance: 'none' }}>
                {BIRTH_CONTROLS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>

            {/* Goal */}
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>What's your primary goal?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => { setGoal(g.id); setError(''); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 14, border: `1.5px solid ${goal === g.id ? '#6E3482' : 'rgba(165,106,189,0.25)'}`,
                    background: goal === g.id ? 'rgba(110,52,130,0.12)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'var(--font-outfit)', textAlign: 'left', transition: 'all .2s',
                  }}>
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: goal === g.id ? '#6E3482' : '#1C0B2E' }}>{g.label}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{g.sub}</p>
                    </div>
                    {goal === g.id && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: '#6E3482', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>{error}</p>}

          <button onClick={goToStep2} style={{
            marginTop: 24, width: '100%', padding: '14px', borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
            fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
            boxShadow: '0 6px 24px rgba(110,52,130,0.35)', letterSpacing: 0.3,
          }}>Continue →</button>
        </>
      )}

      {/* ── Step 2: Cycle setup ── */}
      {step === 2 && (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗓</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>
              Set up your cycle
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#8A6A9A', lineHeight: 1.65 }}>
              It's OK if your last period was weeks ago — we'll calculate your current phase automatically.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>When did your last period start?</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A' }}>Pick a date — even if it was 2 or 3 weeks ago.</p>
              <input type="date" max={today} value={lastPeriod}
                onChange={e => { setLastPeriod(e.target.value); setError(''); }} style={inputBase} />
              {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>Typical cycle length?</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#8A6A9A' }}>Average is 28 days (range: 21–40)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input type="range" min="21" max="40" value={cycleLen} onChange={e => setCycleLen(e.target.value)}
                  style={{ flex: 1, accentColor: '#6E3482', height: 4 }} />
                <span style={{ fontSize: 20, fontWeight: 800, color: '#6E3482', minWidth: 42, textAlign: 'right' }}>{cycleLen}d</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>How long does your period last?</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#8A6A9A' }}>Average is 5 days (range: 3–10)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <input type="range" min="3" max="10" value={periodLen} onChange={e => setPeriodLen(e.target.value)}
                  style={{ flex: 1, accentColor: '#6E3482', height: 4 }} />
                <span style={{ fontSize: 20, fontWeight: 800, color: '#6E3482', minWidth: 42, textAlign: 'right' }}>{periodLen}d</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={goToStep3} style={{
              padding: '14px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
              boxShadow: '0 6px 24px rgba(110,52,130,0.35)', letterSpacing: 0.3,
            }}>Continue →</button>
            <button onClick={() => { setError(''); setStep(1); }} style={{
              padding: '12px', borderRadius: 16, border: 'none', background: 'transparent',
              color: '#8A6A9A', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
            }}>← Back</button>
          </div>
        </>
      )}

      {/* ── Step 3: What Bloom does ── */}
      {step === 3 && (
        <>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🌸</div>
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5 }}>
              You're all set!
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: '#8A6A9A', lineHeight: 1.65 }}>
              Here's what Bloom will do for you every day.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg,rgba(110,52,130,0.15),rgba(165,106,189,0.1))',
                  border: '1px solid rgba(165,106,189,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>{f.emoji}</div>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A', lineHeight: 1.5 }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleFinish} disabled={saving} style={{
              padding: '14px', borderRadius: 16, border: 'none',
              background: saving ? 'rgba(110,52,130,0.4)' : 'linear-gradient(135deg,#6E3482,#A56ABD)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-outfit)',
              boxShadow: saving ? 'none' : '0 6px 24px rgba(110,52,130,0.35)', letterSpacing: 0.3,
            }}>{saving ? 'Setting up…' : 'Start tracking 🌸'}</button>
            <button onClick={() => setStep(2)} style={{
              padding: '12px', borderRadius: 16, border: 'none', background: 'transparent',
              color: '#8A6A9A', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
            }}>← Back</button>
          </div>
        </>
      )}
    </div>
  );
}
