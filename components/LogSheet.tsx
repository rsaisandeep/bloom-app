'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loadData, saveLog, startPeriod, isNewPeriodStart, getCurrentPhase, isLogInputRelevant, PHASE_LOG_RELEVANCE, type DayLog, type Phase } from '@/lib/cycle';
import { appDayKey } from '@/lib/day';
import { fetchFromSheet, saveToSheet } from '@/lib/data';

type Option = { value: string; label: string; emoji: string };
type Field = { key: keyof DayLog; label: string; options: Option[] };

const FLOW_FIELDS: Field[] = [
  { key: 'flow',          label: 'Flow Today',          options: [{value:'none',label:'None',emoji:'⬜'},{value:'light',label:'Light',emoji:'🩸'},{value:'medium',label:'Medium',emoji:'🩸🩸'},{value:'heavy',label:'Heavy',emoji:'🩸🩸🩸'}] },
  { key: 'cramps',        label: 'Cramps',              options: [{value:'none',label:'None',emoji:'😌'},{value:'mild',label:'Mild',emoji:'😐'},{value:'moderate',label:'Moderate',emoji:'😣'},{value:'severe',label:'Severe',emoji:'😫'}] },
  { key: 'bloating',      label: 'Bloating',            options: [{value:'none',label:'None',emoji:'✅'},{value:'mild',label:'Mild',emoji:'😤'},{value:'severe',label:'Severe',emoji:'🫃'}] },
  { key: 'cervicalMucus', label: 'Cervical Mucus',      options: [{value:'none',label:'None',emoji:'⬜'},{value:'dry',label:'Dry',emoji:'🏜️'},{value:'sticky',label:'Sticky',emoji:'🌰'},{value:'creamy',label:'Creamy',emoji:'🥛'},{value:'watery',label:'Watery',emoji:'💧'},{value:'eggwhite',label:'Egg white',emoji:'🥚'},{value:'spotting',label:'Spotting',emoji:'🩸'}] },
  { key: 'sex',           label: 'Sexual Activity',     options: [{value:'none',label:'None',emoji:'⬜'},{value:'protected',label:'Protected',emoji:'🛡️'},{value:'unprotected',label:'Unprotected',emoji:'❤️'}] },
  { key: 'ovulationTest', label: 'Ovulation Test (LH)', options: [{value:'none',label:'Not taken',emoji:'⬜'},{value:'negative',label:'Negative',emoji:'➖'},{value:'positive',label:'Positive',emoji:'➕'}] },
  { key: 'pregnancyTest', label: 'Pregnancy Test',      options: [{value:'none',label:'Not taken',emoji:'⬜'},{value:'negative',label:'Negative',emoji:'➖'},{value:'positive',label:'Positive',emoji:'➕'}] },
  { key: 'pill',          label: 'Birth Control Pill',  options: [{value:'none',label:'N/A',emoji:'⬜'},{value:'taken',label:'Taken',emoji:'✅'},{value:'missed',label:'Missed',emoji:'❌'}] },
];

const WELLBEING_FIELDS: Field[] = [
  { key: 'mood',     label: 'Mood right now',      options: [{value:'happy',label:'Happy',emoji:'😊'},{value:'calm',label:'Calm',emoji:'😌'},{value:'energetic',label:'Energetic',emoji:'⚡'},{value:'anxious',label:'Anxious',emoji:'😰'},{value:'irritable',label:'Irritable',emoji:'😤'},{value:'sad',label:'Sad',emoji:'😢'},{value:'fatigued',label:'Fatigued',emoji:'😴'}] },
  { key: 'energy',   label: 'Energy right now',    options: [{value:'high',label:'High',emoji:'🔋'},{value:'medium',label:'Medium',emoji:'🔆'},{value:'low',label:'Low',emoji:'🪫'},{value:'exhausted',label:'Exhausted',emoji:'💤'}] },
  { key: 'sleep',    label: "Last night's sleep",  options: [{value:'good',label:'Good',emoji:'😴'},{value:'poor',label:'Poor',emoji:'😪'},{value:'insomnia',label:'Insomnia',emoji:'👀'}] },
  { key: 'cravings', label: 'Cravings right now',  options: [{value:'none',label:'None',emoji:'🙅'},{value:'sweet',label:'Sweet',emoji:'🍫'},{value:'salty',label:'Salty',emoji:'🧂'},{value:'everything',label:'Everything',emoji:'🍕'}] },
];

const SYMPTOM_OPTIONS: Option[] = [
  {value:'headache',label:'Headache',emoji:'🤕'},
  {value:'acne',label:'Acne',emoji:'🌋'},
  {value:'backache',label:'Backache',emoji:'🔙'},
  {value:'tender_breasts',label:'Tender breasts',emoji:'💗'},
  {value:'nausea',label:'Nausea',emoji:'🤢'},
  {value:'fatigue',label:'Fatigue',emoji:'🥱'},
  {value:'dizziness',label:'Dizziness',emoji:'😵‍💫'},
  {value:'hot_flashes',label:'Hot flashes',emoji:'🥵'},
  {value:'chills',label:'Chills',emoji:'🥶'},
  {value:'diarrhea',label:'Diarrhea',emoji:'💩'},
  {value:'constipation',label:'Constipation',emoji:'🧱'},
  {value:'joint_pain',label:'Joint pain',emoji:'🦴'},
  {value:'pelvic_pain',label:'Pelvic pain',emoji:'🫁'},
  {value:'leg_cramps',label:'Leg cramps',emoji:'🦵'},
  {value:'low_libido',label:'Low libido',emoji:'💤'},
];

const DEFAULTS: Partial<DayLog> = {
  cramps: 'none', energy: 'medium', mood: 'calm', bloating: 'none',
  sleep: 'good', cravings: 'none', flow: 'none', cervicalMucus: 'none',
  sex: 'none', ovulationTest: 'none', pregnancyTest: 'none', pill: 'none', symptoms: [],
};

// Active chip color varies with cycle phase
const PHASE_CHIP: Record<Phase, { bg: string; border: string; color: string; shadow: string }> = {
  menstrual:  { bg: 'rgba(244,63,94,0.13)',  border: 'rgba(244,63,94,0.5)',  color: '#be123c', shadow: '0 0 0 2px rgba(244,63,94,0.18)'  },
  follicular: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.5)', color: '#6d28d9', shadow: '0 0 0 2px rgba(124,58,237,0.18)' },
  ovulation:  { bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.5)',  color: '#b45309', shadow: '0 0 0 2px rgba(217,119,6,0.18)'  },
  luteal:     { bg: 'rgba(79,70,229,0.12)',  border: 'rgba(79,70,229,0.5)',  color: '#4338ca', shadow: '0 0 0 2px rgba(79,70,229,0.18)'  },
};

type Tab = 'flow' | 'symptoms' | 'wellbeing';
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'flow',      label: 'Flow',      emoji: '🩸' },
  { id: 'symptoms',  label: 'Symptoms',  emoji: '💊' },
  { id: 'wellbeing', label: 'Wellbeing', emoji: '✨' },
];

interface LogSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  date?: string;
}

export default function LogSheet({ open, onClose, onSaved, date: dateProp }: LogSheetProps) {
  const router = useRouter();
  const today = appDayKey();
  const date = dateProp ?? today;
  const isToday = date === today;
  const [form, setForm] = useState<Partial<DayLog>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phase, setPhase] = useState<Phase>('follicular');
  const [tab, setTab] = useState<Tab>('flow');
  const [showMore, setShowMore] = useState(false); // reveal phase-atypical log inputs
  const [showHelp, setShowHelp] = useState(false); // "how check-ins work" explainer
  const isMorning = new Date().getHours() < 12;

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setSaving(false);
    setTab('flow');
    setShowMore(false);
    setShowHelp(false);
    const cachedData = loadData();
    const cached = cachedData.logs.find((l) => l.date === date);
    setForm(cached ?? DEFAULTS);
    setPhase(getCurrentPhase(cachedData).phase);
    fetchFromSheet().then((data) => {
      setPhase(getCurrentPhase(data).phase);
      const existing = data.logs.find((l) => l.date === date);
      if (existing) setForm(existing);
    });
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function select(key: keyof DayLog, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'flow' && value !== 'none') {
      const data = loadData();
      if (isNewPeriodStart(data, date)) {
        const session = (() => { try { return JSON.parse(localStorage.getItem('bloom_session') || '{}'); } catch { return {}; } })();
        startPeriod(date, session.username || 'me');
      }
    }
  }

  function toggleSymptom(v: string) {
    setForm((f) => {
      const cur = f.symptoms ?? [];
      return { ...f, symptoms: cur.includes(v) ? cur.filter((s) => s !== v) : [...cur, v] };
    });
  }

  async function handleSave() {
    setSaving(true);
    const log = { ...DEFAULTS, ...form, date } as DayLog;
    saveLog(log);
    await saveToSheet(loadData());
    setSaved(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 500);
  }

  const pc = PHASE_CHIP[phase];

  const LABEL = {
    margin: '0 0 10px', fontSize: '.72rem', fontWeight: 800,
    color: '#1C0B2E', letterSpacing: '.1px', textTransform: 'uppercase' as const,
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '8px 12px', borderRadius: 12, fontSize: '.78rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all .18s cubic-bezier(.22,.61,.36,1)',
    border: active ? `1px solid ${pc.border}` : '1px solid var(--glass-border-dim)',
    background: active ? pc.bg : 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    color: active ? pc.color : '#1C0B2E',
    boxShadow: active ? pc.shadow : '0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.8)',
    fontFamily: 'inherit',
  });

  const fieldCard = (field: Field) => (
    <div key={field.key} className="glass-card" style={{ padding: '14px 14px 12px' }}>
      <p style={LABEL}>{field.label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {field.options.map((opt) => (
          <button key={opt.value} onClick={() => select(field.key, opt.value)} style={chipStyle(form[field.key] === opt.value)}>
            <span>{opt.emoji}</span><span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const bbtCard = (
    <div key="bbt" className="glass-card" style={{ padding: '14px 14px 12px' }}>
      <p style={LABEL}>
        Basal Body Temp{' '}
        <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· measure before getting up</span>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number" inputMode="decimal" step="0.01" min="34" max="42"
          value={form.bbt ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, bbt: e.target.value === '' ? undefined : Number(e.target.value) }))}
          placeholder="36.55"
          style={{
            width: 120, padding: '10px 12px', borderRadius: 12, fontSize: '.95rem', fontWeight: 700,
            border: '1px solid var(--glass-border-dim)', background: 'rgba(255,255,255,0.55)',
            color: '#1C0B2E', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#8A6A9A' }}>°C</span>
      </div>
    </div>
  );

  // Collapsible group for inputs that aren't typical for the current phase —
  // kept reachable (collapse, not hide) so anything can still be logged.
  const moreSection = (content: React.ReactNode) => (
    <>
      <button
        onClick={() => setShowMore((s) => !s)}
        style={{
          alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '4px 2px',
          color: '#8A6A9A', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {showMore ? '▴ Hide other inputs' : '▾ Other inputs · less common this phase'}
      </button>
      {showMore && content}
    </>
  );

  if (!open) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(28,11,46,0.45)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 300,
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448,
        background: 'linear-gradient(180deg,#EEE8F5 0%,#E4DCF0 100%)',
        borderRadius: '28px 28px 0 0', zIndex: 301,
        height: '90dvh', overflowY: 'auto',
        overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
        animation: 'slideUp .32s cubic-bezier(.34,1.2,.64,1) both',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}>

        {/* Sticky header + tabs */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          background: 'rgba(238,232,245,0.96)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', borderRadius: '28px 28px 0 0',
          paddingBottom: 0,
        }}>
          <div style={{ padding: '12px 16px 10px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(110,52,130,0.2)', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1C0B2E', textAlign: 'center' }}>
                  {isToday ? "Today's Check-in" : 'Edit Log'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A' }}>
                  {isToday
                    ? (isMorning ? '🌅 Morning check-in' : '🌙 Evening check-in')
                    : new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(165,106,189,0.15)', border: 'none', borderRadius: 999,
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#6E3482', fontSize: 16, fontFamily: 'inherit',
              }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(165,106,189,0.15)', padding: '0 8px' }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setShowMore(false); }} style={{
                flex: 1, padding: '9px 4px 8px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '.8rem', fontWeight: 800, background: 'transparent',
                color: tab === t.id ? pc.color : '#8A6A9A',
                borderBottom: tab === t.id ? `2.5px solid ${pc.color}` : '2.5px solid transparent',
                transition: 'all .2s', marginBottom: -1,
              }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* How check-ins work — plain-English explainer */}
          <div className="glass-card" style={{ padding: '10px 14px' }}>
            <button
              onClick={() => setShowHelp((s) => !s)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '.82rem', fontWeight: 800, color: '#6E3482',
              }}
            >
              <span>💡 How check-ins work</span>
              <span style={{ color: '#8A6A9A' }}>{showHelp ? '▴' : '▾'}</span>
            </button>
            {showHelp && (
              <div style={{ marginTop: 8, fontSize: '.8rem', lineHeight: 1.55, color: '#4A3358' }}>
                <p style={{ margin: '0 0 6px' }}>
                  <b>Check in once a day — morning is best.</b> Your tasks for the day are built from
                  this check-in plus where you are in your cycle, so logging early gives you the
                  whole day to act on them.
                </p>
                <p style={{ margin: '0 0 6px' }}>
                  <b>Answer for right now.</b> Mood, energy and cravings ask how you feel <i>at this
                  moment</i>, not the whole day — so you can answer first thing. Sleep is about last night.
                </p>
                <p style={{ margin: '0 0 6px' }}>
                  <b>Before you log, we show yesterday&apos;s tasks as a head start</b> — your body
                  rarely changes overnight. Saving today&apos;s check-in refreshes them.
                </p>
                <p style={{ margin: 0 }}>
                  <b>You can reopen any time.</b> Tweak it in the evening to capture how the day
                  actually went — that sharpens your patterns and seeds tomorrow morning.
                </p>
                <p style={{ margin: '6px 0 0', color: '#8A6A9A' }}>
                  We surface the inputs that matter most for your <b>{phase}</b> phase first; the
                  rest are tucked under <i>“Other inputs.”</i> Everything stays loggable.
                </p>
              </div>
            )}
          </div>

          {/* ── Flow tab (phase-relevant first, rest under "More") ── */}
          {tab === 'flow' && (() => {
            const relevant = FLOW_FIELDS.filter((f) => isLogInputRelevant(phase, f.key));
            const other = FLOW_FIELDS.filter((f) => !isLogInputRelevant(phase, f.key));
            const bbtRelevant = isLogInputRelevant(phase, 'bbt');
            return (
              <>
                {relevant.map(fieldCard)}
                {bbtRelevant && bbtCard}
                {(other.length > 0 || !bbtRelevant) && moreSection(
                  <>
                    {other.map(fieldCard)}
                    {!bbtRelevant && bbtCard}
                  </>
                )}
              </>
            );
          })()}

          {/* ── Symptoms tab (phase-likely symptoms shown first) ── */}
          {tab === 'symptoms' && (() => {
            const likely = new Set(PHASE_LOG_RELEVANCE[phase].symptoms);
            const ordered = [...SYMPTOM_OPTIONS].sort(
              (a, b) => (likely.has(a.value) ? 0 : 1) - (likely.has(b.value) ? 0 : 1)
            );
            return (
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>Symptoms <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· common for this phase first</span></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {ordered.map((opt) => {
                    const active = (form.symptoms ?? []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => toggleSymptom(opt.value)} style={chipStyle(active)}>
                        <span>{opt.emoji}</span><span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Wellbeing tab (phase-relevant first, rest under "More") ── */}
          {tab === 'wellbeing' && (
            <>
              {WELLBEING_FIELDS.filter((f) => isLogInputRelevant(phase, f.key)).map(fieldCard)}
              {(() => {
                const other = WELLBEING_FIELDS.filter((f) => !isLogInputRelevant(phase, f.key));
                return other.length > 0 ? moreSection(<>{other.map(fieldCard)}</>) : null;
              })()}

              {/* Water stepper — a running tally you top up through the day */}
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>Water <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· tap + through the day</span></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => setForm((f) => ({ ...f, water: Math.max(0, (f.water ?? 0) - 1) }))} style={{
                    width: 38, height: 38, borderRadius: 12, border: '1px solid var(--glass-border-dim)', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.55)', color: '#6E3482', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'inherit',
                  }}>−</button>
                  <span style={{ minWidth: 70, textAlign: 'center', fontSize: '1rem', fontWeight: 800, color: '#1C0B2E' }}>
                    💧 {form.water ?? 0}
                  </span>
                  <button onClick={() => setForm((f) => ({ ...f, water: (f.water ?? 0) + 1 }))} style={{
                    width: 38, height: 38, borderRadius: 12, border: '1px solid var(--glass-border-dim)', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.55)', color: '#6E3482', fontSize: '1.1rem', fontWeight: 800, fontFamily: 'inherit',
                  }}>+</button>
                  {/* Quick-add presets */}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    {[1, 2, 3].map((n) => (
                      <button key={n} onClick={() => setForm((f) => ({ ...f, water: (f.water ?? 0) + n }))} style={{
                        padding: '6px 10px', borderRadius: 999, border: '1px solid var(--glass-border-dim)', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.55)', color: '#6E3482', fontSize: '.78rem', fontWeight: 800, fontFamily: 'inherit',
                      }}>+{n}</button>
                    ))}
                  </div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '.72rem', color: '#8A6A9A' }}>Tally as you go — reopen any time to add more.</p>
              </div>

              {/* Weight */}
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>Weight <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· optional</span></p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" inputMode="decimal" step="0.1" min="20" max="300"
                    value={form.weight ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    placeholder="60.0"
                    style={{
                      width: 120, padding: '10px 12px', borderRadius: 12, fontSize: '.95rem', fontWeight: 700,
                      border: '1px solid var(--glass-border-dim)', background: 'rgba(255,255,255,0.55)',
                      color: '#1C0B2E', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#8A6A9A' }}>kg</span>
                </div>
              </div>

              {/* Notes */}
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>Notes <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· optional</span></p>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
                  placeholder="Anything else to note…"
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: '.85rem',
                    border: '1px solid var(--glass-border-dim)', background: 'rgba(255,255,255,0.55)',
                    color: '#1C0B2E', fontFamily: 'inherit', outline: 'none', resize: 'none',
                    lineHeight: 1.55, boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', marginTop: 6, padding: '14px', border: 0,
            borderRadius: 16, fontWeight: 800, fontSize: '1rem', color: '#fff',
            background: saved
              ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : saving ? 'rgba(110,52,130,0.5)'
              : 'linear-gradient(135deg,#6E3482,#49225B)',
            boxShadow: saved
              ? '0 8px 24px rgba(34,197,94,0.35)'
              : '0 8px 24px rgba(110,52,130,0.35),inset 0 1px 0 rgba(255,255,255,0.2)',
            cursor: saving ? 'default' : 'pointer',
            transition: 'all .2s cubic-bezier(.22,.61,.36,1)',
            fontFamily: 'inherit',
          }}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : isToday ? 'Save check-in →' : 'Save changes →'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
