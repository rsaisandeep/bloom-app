'use client';
import { useState, useEffect } from 'react';
import { loadData, saveLog, startPeriod, isNewPeriodStart, type DayLog } from '@/lib/cycle';
import { appDayKey } from '@/lib/day';
import { fetchFromSheet, saveToSheet } from '@/lib/data';

type Option = { value: string; label: string; emoji: string };
type Field = { key: keyof DayLog; label: string; options: Option[] };

// Always-visible everyday fields.
const CORE_FIELDS: Field[] = [
  { key: 'flow',     label: 'Flow Today',         options: [{value:'none',label:'None',emoji:'⬜'},{value:'light',label:'Light',emoji:'🩸'},{value:'medium',label:'Medium',emoji:'🩸🩸'},{value:'heavy',label:'Heavy',emoji:'🩸🩸🩸'}] },
  { key: 'cramps',   label: 'Cramps',             options: [{value:'none',label:'None',emoji:'😌'},{value:'mild',label:'Mild',emoji:'😐'},{value:'moderate',label:'Moderate',emoji:'😣'},{value:'severe',label:'Severe',emoji:'😫'}] },
  { key: 'mood',     label: 'Mood',               options: [{value:'happy',label:'Happy',emoji:'😊'},{value:'calm',label:'Calm',emoji:'😌'},{value:'energetic',label:'Energetic',emoji:'⚡'},{value:'anxious',label:'Anxious',emoji:'😰'},{value:'irritable',label:'Irritable',emoji:'😤'},{value:'sad',label:'Sad',emoji:'😢'},{value:'fatigued',label:'Fatigued',emoji:'😴'}] },
  { key: 'energy',   label: 'Energy Level',       options: [{value:'high',label:'High',emoji:'🔋'},{value:'medium',label:'Medium',emoji:'🔆'},{value:'low',label:'Low',emoji:'🪫'},{value:'exhausted',label:'Exhausted',emoji:'💤'}] },
  { key: 'bloating', label: 'Bloating',           options: [{value:'none',label:'None',emoji:'✅'},{value:'mild',label:'Mild',emoji:'😤'},{value:'severe',label:'Severe',emoji:'🫃'}] },
  { key: 'sleep',    label: "Last Night's Sleep", options: [{value:'good',label:'Good',emoji:'😴'},{value:'poor',label:'Poor',emoji:'😪'},{value:'insomnia',label:'Insomnia',emoji:'👀'}] },
  { key: 'cravings', label: 'Cravings',           options: [{value:'none',label:'None',emoji:'🙅'},{value:'sweet',label:'Sweet',emoji:'🍫'},{value:'salty',label:'Salty',emoji:'🧂'},{value:'everything',label:'Everything',emoji:'🍕'}] },
];

// Tucked under "Add more" for users tracking fertility / contraception.
const MORE_FIELDS: Field[] = [
  { key: 'cervicalMucus', label: 'Cervical Mucus', options: [{value:'none',label:'None',emoji:'⬜'},{value:'dry',label:'Dry',emoji:'🏜️'},{value:'sticky',label:'Sticky',emoji:'🌰'},{value:'creamy',label:'Creamy',emoji:'🥛'},{value:'watery',label:'Watery',emoji:'💧'},{value:'eggwhite',label:'Egg white',emoji:'🥚'},{value:'spotting',label:'Spotting',emoji:'🩸'}] },
  { key: 'sex', label: 'Sexual Activity', options: [{value:'none',label:'None',emoji:'⬜'},{value:'protected',label:'Protected',emoji:'🛡️'},{value:'unprotected',label:'Unprotected',emoji:'❤️'}] },
  { key: 'ovulationTest', label: 'Ovulation Test (LH)', options: [{value:'none',label:'Not taken',emoji:'⬜'},{value:'negative',label:'Negative',emoji:'➖'},{value:'positive',label:'Positive',emoji:'➕'}] },
  { key: 'pregnancyTest', label: 'Pregnancy Test', options: [{value:'none',label:'Not taken',emoji:'⬜'},{value:'negative',label:'Negative',emoji:'➖'},{value:'positive',label:'Positive',emoji:'➕'}] },
  { key: 'pill', label: 'Birth Control Pill', options: [{value:'none',label:'N/A',emoji:'⬜'},{value:'taken',label:'Taken',emoji:'✅'},{value:'missed',label:'Missed',emoji:'❌'}] },
];

const SYMPTOM_OPTIONS: Option[] = [
  {value:'headache',label:'Headache',emoji:'🤕'},
  {value:'acne',label:'Acne',emoji:'🌋'},
  {value:'backache',label:'Backache',emoji:'🔙'},
  {value:'tender_breasts',label:'Tender breasts',emoji:'💗'},
  {value:'nausea',label:'Nausea',emoji:'🤢'},
  {value:'fatigue',label:'Fatigue',emoji:'🥱'},
];
const PRESET_SYMPTOMS = new Set(SYMPTOM_OPTIONS.map((o) => o.value));
const DEFAULTS: Partial<DayLog> = { cramps:'none', energy:'medium', mood:'calm', bloating:'none', sleep:'good', cravings:'none', flow:'none', cervicalMucus:'none', sex:'none', ovulationTest:'none', pregnancyTest:'none', pill:'none', symptoms:[] };

interface LogSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** Specific date to log (e.g. from calendar). Defaults to today. */
  date?: string;
}

export default function LogSheet({ open, onClose, onSaved, date: dateProp }: LogSheetProps) {
  const today = appDayKey();
  const date = dateProp ?? today;
  const isToday = date === today;
  const [form, setForm] = useState<Partial<DayLog>>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');

  // Reveal the advanced section automatically when a log already has data there.
  function hasMoreData(l: Partial<DayLog>): boolean {
    return (l.cervicalMucus && l.cervicalMucus !== 'none') || (l.sex && l.sex !== 'none') ||
      (l.ovulationTest && l.ovulationTest !== 'none') || (l.pregnancyTest && l.pregnancyTest !== 'none') ||
      (l.pill && l.pill !== 'none') || l.bbt != null || l.water != null || l.weight != null || false;
  }

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setSaving(false);
    setCustomSymptom('');
    const cached = loadData().logs.find((l) => l.date === date);
    const initial = cached ?? DEFAULTS;
    setForm(initial);
    setShowMore(hasMoreData(initial));
    fetchFromSheet().then((data) => {
      const existing = data.logs.find((l) => l.date === date);
      if (existing) { setForm(existing); if (hasMoreData(existing)) setShowMore(true); }
    });
  }, [open, date]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
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

  function addCustomSymptom() {
    const v = customSymptom.trim().toLowerCase();
    if (!v) return;
    setCustomSymptom('');
    setForm((f) => {
      const cur = f.symptoms ?? [];
      return cur.includes(v) ? f : { ...f, symptoms: [...cur, v] };
    });
  }

  const LABEL = { margin: '0 0 10px', fontSize: '.72rem', fontWeight: 800, color: '#1C0B2E', letterSpacing: '.1px', textTransform: 'uppercase' as const };
  const chipStyle = (active: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '8px 12px', borderRadius: 12, fontSize: '.78rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all .18s cubic-bezier(.22,.61,.36,1)',
    border: active ? '1px solid rgba(110,52,130,0.5)' : '1px solid var(--glass-border-dim)',
    background: active ? 'rgba(110,52,130,0.12)' : 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    color: active ? '#6E3482' : '#1C0B2E',
    boxShadow: active ? '0 0 0 2px rgba(110,52,130,0.2)' : '0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.8)',
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

  async function handleSave() {
    setSaving(true);
    const log = { ...DEFAULTS, ...form, date } as DayLog;
    saveLog(log);
    await saveToSheet(loadData());
    setSaved(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 500);
  }

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(28,11,46,0.45)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 300,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448,
        background: 'linear-gradient(180deg,#EEE8F5 0%,#E4DCF0 100%)',
        borderRadius: '24px 24px 0 0',
        zIndex: 301,
        maxHeight: '92dvh', overflowY: 'auto',
        animation: 'slideUp .32s cubic-bezier(.34,1.2,.64,1) both',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}>
        {/* Sticky header */}
        <div style={{
          padding: '12px 16px 10px', position: 'sticky', top: 0, zIndex: 1,
          background: 'rgba(238,232,245,0.92)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px 24px 0 0',
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(110,52,130,0.2)', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>
                {isToday ? "Today's Check-in" : 'Edit Log'}
              </h2>
              {!isToday && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A' }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(165,106,189,0.15)', border: 'none', borderRadius: 999,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#6E3482', fontSize: 16, fontFamily: 'inherit',
            }}>✕</button>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CORE_FIELDS.map(fieldCard)}

          {/* Symptoms — multi-select + custom */}
          <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
            <p style={LABEL}>
              Symptoms <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· select all that apply</span>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SYMPTOM_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => toggleSymptom(opt.value)} style={chipStyle((form.symptoms ?? []).includes(opt.value))}>
                  <span>{opt.emoji}</span><span>{opt.label}</span>
                </button>
              ))}
              {(form.symptoms ?? []).filter((s) => !PRESET_SYMPTOMS.has(s)).map((s) => (
                <button key={s} onClick={() => toggleSymptom(s)} style={chipStyle(true)}>
                  <span>{s}</span><span>✕</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
              <input
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSymptom(); } }}
                placeholder="Add your own…"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: '.85rem', fontWeight: 600,
                  border: '1px solid var(--glass-border-dim)', background: 'rgba(255,255,255,0.55)',
                  color: '#1C0B2E', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button onClick={addCustomSymptom} style={{
                padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(110,52,130,0.12)', color: '#6E3482', fontSize: '.82rem', fontWeight: 800, fontFamily: 'inherit',
              }}>Add</button>
            </div>
          </div>

          {/* Add more (optional) — fertility, contraception, body metrics */}
          <button onClick={() => setShowMore((s) => !s)} className="glass-card" style={{
            padding: '13px 16px', textAlign: 'left', cursor: 'pointer', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#6E3482', fontSize: '.85rem', fontWeight: 800, fontFamily: 'inherit', border: '1px solid var(--glass-border-dim)',
          }}>
            <span>{showMore ? 'Hide extra tracking' : 'Add more — fertility, pill, weight…'}</span>
            <span>{showMore ? '▲' : '▼'}</span>
          </button>

          {showMore && (
            <>
              {MORE_FIELDS.map(fieldCard)}

              {/* Basal body temperature */}
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>
                  Basal Body Temp <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· measure before getting up</span>
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

              {/* Water intake — stepper */}
              <div className="glass-card" style={{ padding: '14px 14px 12px' }}>
                <p style={LABEL}>Water <span style={{ fontWeight: 600, textTransform: 'none', color: '#8A6A9A' }}>· glasses today</span></p>
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
                </div>
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
            </>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', marginTop: 6, padding: '14px', border: 0,
            borderRadius: 16, fontWeight: 800, fontSize: '1rem', color: '#fff',
            background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : saving ? 'rgba(110,52,130,0.5)' : 'linear-gradient(135deg,#6E3482,#49225B)',
            boxShadow: saved ? '0 8px 24px rgba(34,197,94,0.35)' : '0 8px 24px rgba(110,52,130,0.35),inset 0 1px 0 rgba(255,255,255,0.2)',
            cursor: saving ? 'default' : 'pointer', transition: 'all .2s cubic-bezier(.22,.61,.36,1)',
            fontFamily: 'inherit',
          }}>
            {saved ? '✓ Saved!' : saving ? 'Saving…' : isToday ? 'Save check-in →' : 'Save changes →'}
          </button>
        </div>
      </div>
    </>
  );
}
