'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loadData } from '@/lib/cycle';
import { saveToSheet } from '@/lib/data';

const CONDITIONS: { id: string; label: string; info?: { title: string; body: string; cycle: string } }[] = [
  { id: 'none', label: 'None' },
  {
    id: 'pcos', label: 'PCOS',
    info: {
      title: 'PCOS — Polycystic Ovary Syndrome',
      body: 'A common hormonal condition where the ovaries may not release an egg regularly. It can cause irregular or missed periods, acne, extra hair growth, and weight changes. It’s manageable — diet, movement, and tracking help a lot.',
      cycle: 'Cycles are often longer or unpredictable, so Bloom shows your period as a date range instead of a single day.',
    },
  },
  {
    id: 'endometriosis', label: 'Endometriosis',
    info: {
      title: 'Endometriosis',
      body: 'Tissue similar to the uterine lining grows outside the uterus. It often causes painful, heavy periods and pelvic pain that can flare around your period.',
      cycle: 'Logging pain and flow each day builds a record you and your doctor can use to spot patterns and triggers.',
    },
  },
  {
    id: 'thyroid', label: 'Thyroid condition',
    info: {
      title: 'Thyroid condition',
      body: 'An under-active (hypo) or over-active (hyper) thyroid affects the hormones that drive your cycle. It can make periods heavier, lighter, longer, shorter, or skip them altogether.',
      cycle: 'Keeping a steady cycle + symptom log helps you and your doctor see whether your thyroid is affecting your cycle.',
    },
  },
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Step 1
  const [age, setAge] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [birthControl, setBirthControl] = useState('none');
  const [goals, setGoals] = useState<string[]>([]);
  const [infoId, setInfoId] = useState<string | null>(null);

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

  function toggleGoal(id: string) {
    setError('');
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  }

  function goToStep2() {
    const a = parseInt(age);
    if (!age || isNaN(a) || a < 10 || a > 60) { setError('Please enter a valid age (10–60).'); return; }
    if (!goals.length) { setError('Please select at least one goal.'); return; }
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
      // Don't auto-set periodEndDate — the end date is an explicit user action.
      // periodLength alone drives phase math; the end-date field stays empty
      // until the user confirms it in the Log period modal.
      data.cycles = [{
        id: `${uname}_${lastPeriod}`,
        startDate: lastPeriod,
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
      goals,
      goal: goals[0], // keep legacy single-goal field populated for any old readers
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
    <div style={{ minHeight: '100dvh', padding: '40px 20px 60px' }}>

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
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5, textAlign: 'center' }}>
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
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A' }}>Select all that apply · tap ⓘ to learn more</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CONDITIONS.map(c => {
                  const active = conditions.includes(c.id) || (c.id === 'none' && conditions.length === 0);
                  return (
                    <div key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => toggleCondition(c.id)} style={pill(active)}>{c.label}</button>
                      {c.info && (
                        <button onClick={() => setInfoId(c.id)} aria-label={`About ${c.label}`} style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                          border: '1.5px solid rgba(165,106,189,0.4)', background: 'rgba(165,106,189,0.08)',
                          color: '#6E3482', fontSize: 13, fontWeight: 800, fontStyle: 'italic',
                          fontFamily: 'var(--font-outfit)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}>i</button>
                      )}
                    </div>
                  );
                })}
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

            {/* Goals */}
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#49225B' }}>What are your goals?</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A' }}>Pick all that apply — this tailors your tasks and reports</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GOALS.map(g => {
                  const on = goals.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 14, border: `1.5px solid ${on ? '#6E3482' : 'rgba(165,106,189,0.25)'}`,
                      background: on ? 'rgba(110,52,130,0.12)' : 'transparent',
                      cursor: 'pointer', fontFamily: 'var(--font-outfit)', textAlign: 'left', transition: 'all .2s',
                    }}>
                      <span style={{ fontSize: 22 }}>{g.emoji}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: on ? '#6E3482' : '#1C0B2E' }}>{g.label}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{g.sub}</p>
                      </div>
                      <div style={{
                        marginLeft: 'auto', width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        border: on ? 'none' : '2px solid rgba(165,106,189,0.4)',
                        background: on ? '#6E3482' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </button>
                  );
                })}
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
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5, textAlign: 'center' }}>
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
            <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5, textAlign: 'center' }}>
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

      {/* ── Health-condition info popup ── */}
      {mounted && infoId && createPortal(
        (() => {
          const c = CONDITIONS.find(x => x.id === infoId);
          if (!c?.info) return null;
          return (
            <div onClick={() => setInfoId(null)} style={{
              position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, background: 'rgba(28,11,46,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: 380, background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: 24, padding: '22px 22px 20px', boxShadow: '0 20px 60px rgba(110,52,130,0.3)',
                animation: 'floatIn .25s cubic-bezier(.22,.8,.3,1) both',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C0B2E', lineHeight: 1.3 }}>{c.info.title}</p>
                  <button onClick={() => setInfoId(null)} aria-label="Close" style={{
                    width: 30, height: 30, borderRadius: 999, flexShrink: 0, cursor: 'pointer', border: 'none',
                    background: 'rgba(165,106,189,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#6E3482" strokeWidth="2.4" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: 14, color: '#49225B', lineHeight: 1.6 }}>{c.info.body}</p>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(165,106,189,0.1)', borderLeft: '3px solid #A56ABD' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: '#A56ABD' }}>How Bloom helps</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6E3482', lineHeight: 1.55 }}>{c.info.cycle}</p>
                </div>
                <button onClick={() => setInfoId(null)} style={{
                  marginTop: 16, width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                }}>Got it</button>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
