'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { loadData } from '@/lib/cycle';
import { saveToSheet } from '@/lib/data';
import {
  parseCSV, autoMap, buildImport, IMPORT_FIELDS,
  isFloExport, buildFloImport,
  type ParsedCSV, type Mapping, type ImportResult,
} from '@/lib/importData';

const SKIP = '__skip__';

export default function ImportSheet({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'pick' | 'map' | 'flo' | 'done'>('pick');
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [floPreview, setFloPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep('pick'); setParsed(null); setMapping({}); setFloPreview(null); setError(''); setResult(null); }
  }, [open]);

  // Live preview of what will be imported as the mapping changes (CSV path).
  const preview = useMemo(
    () => (parsed && mapping.date ? buildImport(parsed, mapping, loadData()) : null),
    [parsed, mapping],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      // Flo's real export is JSON (operationalData.cycles) — detect and use the
      // native path so the emailed file works without converting to CSV first.
      const looksJson = file.name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{');
      if (looksJson) {
        let obj: unknown;
        try { obj = JSON.parse(text); } catch { setError('That JSON file is not valid. Re-download your Flo export.'); return; }
        if (isFloExport(obj)) {
          setFloPreview(buildFloImport(obj, loadData()));
          setStep('flo');
          return;
        }
        setError("That JSON doesn't look like a Flo export (no cycles found). Try the CSV path instead.");
        return;
      }
      const p = parseCSV(text);
      if (!p.headers.length || !p.rows.length) { setError('That file has no rows we can read. Export a CSV and try again.'); return; }
      setParsed(p);
      setMapping(autoMap(p.headers));
      setStep('map');
    } catch {
      setError('Could not read that file. Upload a .json (Flo) or .csv export.');
    }
  }

  async function doImport(res: ImportResult) {
    setSaving(true);
    await saveToSheet(res.data);
    setResult(res);
    setSaving(false);
    setStep('done');
    onImported?.();
  }
  async function confirmImport() {
    if (preview) await doImport(preview);
  }

  if (!mounted || !open) return null;

  const headerOptions = parsed?.headers ?? [];

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(28,11,46,0.45)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto',
        background: '#F7F3FB', borderRadius: '28px 28px 0 0', padding: '20px 20px 32px',
        boxShadow: '0 -10px 40px rgba(110,52,130,0.25)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(165,106,189,0.3)', margin: '0 auto 18px' }} />

        {step === 'pick' && (
          <>
            <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>Import from another app</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#8A6A9A', lineHeight: 1.55 }}>
              Bring your history from Flo, Clue, Apple Health or any tracker that exports a CSV. We&apos;ll map the columns for you — nothing is overwritten.
            </p>

            <div className="glass-card tint-purple" style={{ padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 800, color: '#6E3482' }}>📲 Getting your Flo data</p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#49225B', lineHeight: 1.6 }}>
                <li>In Flo: tap your avatar → <strong>Settings</strong> → request a data export (or Help → Contact us).</li>
                <li>Flo emails you a <strong>JSON</strong> file — upload it directly below.</li>
                <li>Other apps (Clue, Apple Health): upload their <strong>CSV</strong> and we&apos;ll map the columns.</li>
              </ol>
            </div>

            <input ref={fileRef} type="file" accept=".json,application/json,.csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
              fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-outfit)',
              boxShadow: '0 8px 24px rgba(110,52,130,0.3)',
            }}>⬆ Choose a Flo JSON or CSV file</button>
            {error && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>{error}</p>}
          </>
        )}

        {step === 'map' && parsed && (
          <>
            <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>Match your columns</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A', lineHeight: 1.5 }}>
              We guessed these from your file. Adjust any that look wrong — <strong>Date</strong> is required.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1C0B2E' }}>
                    {f.label}{('required' in f && f.required) && <span style={{ color: '#dc2626' }}> *</span>}
                  </span>
                  <select
                    value={mapping[f.key] ?? SKIP}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === SKIP ? undefined : e.target.value }))}
                    style={{
                      flex: 1, padding: '9px 10px', borderRadius: 10, fontSize: 13,
                      border: '1.5px solid rgba(165,106,189,0.3)', background: '#fff',
                      color: '#49225B', fontFamily: 'var(--font-outfit)',
                    }}>
                    <option value={SKIP}>— skip —</option>
                    {headerOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {preview && (
              <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#49225B', lineHeight: 1.6 }}>
                Found <strong>{preview.logCount}</strong> daily logs and <strong>{preview.cycleCount}</strong> period starts
                {preview.dateRange && <> from <strong>{preview.dateRange.from}</strong> to <strong>{preview.dateRange.to}</strong></>}.
                {preview.skipped > 0 && <span style={{ color: '#B45309' }}> {preview.skipped} rows skipped (no valid date).</span>}
              </div>
            )}
            {!mapping.date && <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#dc2626' }}>Pick which column holds the date to continue.</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('pick')} style={{
                flex: 1, padding: '13px', borderRadius: 14, cursor: 'pointer',
                border: '1.5px solid rgba(165,106,189,0.35)', background: 'transparent',
                color: '#6E3482', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-outfit)',
              }}>Back</button>
              <button onClick={confirmImport} disabled={!mapping.date || saving || !preview?.logCount} style={{
                flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                cursor: mapping.date && !saving ? 'pointer' : 'default',
                background: mapping.date && !saving && preview?.logCount ? 'linear-gradient(135deg,#6E3482,#49225B)' : 'rgba(165,106,189,0.3)',
                color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-outfit)',
              }}>{saving ? 'Importing…' : `Import ${preview?.logCount ?? 0} logs`}</button>
            </div>
          </>
        )}

        {step === 'flo' && floPreview && (
          <>
            <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>Flo export detected 🌸</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A', lineHeight: 1.55 }}>
              We read your cycles straight from the Flo file — no column mapping needed. Nothing you&apos;ve already logged is overwritten.
            </p>
            <div className="glass-card tint-purple" style={{ padding: '14px 16px', marginBottom: 16, fontSize: 13.5, color: '#49225B', lineHeight: 1.7 }}>
              <div>🩸 <strong>{floPreview.cycleCount}</strong> cycles</div>
              <div>📅 <strong>{floPreview.logCount}</strong> period days reconstructed</div>
              {floPreview.dateRange && <div>🗓 <strong>{floPreview.dateRange.from}</strong> → <strong>{floPreview.dateRange.to}</strong></div>}
            </div>
            {floPreview.cycleCount === 0 && <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#dc2626' }}>No cycles found in this file.</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('pick')} style={{
                flex: 1, padding: '13px', borderRadius: 14, cursor: 'pointer',
                border: '1.5px solid rgba(165,106,189,0.35)', background: 'transparent',
                color: '#6E3482', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-outfit)',
              }}>Back</button>
              <button onClick={() => doImport(floPreview)} disabled={saving || !floPreview.cycleCount} style={{
                flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                cursor: saving || !floPreview.cycleCount ? 'default' : 'pointer',
                background: !saving && floPreview.cycleCount ? 'linear-gradient(135deg,#6E3482,#49225B)' : 'rgba(165,106,189,0.3)',
                color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-outfit)',
              }}>{saving ? 'Importing…' : `Import ${floPreview.cycleCount} cycles`}</button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>Import complete</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8A6A9A', lineHeight: 1.6 }}>
              Added <strong>{result.logCount}</strong> logs and <strong>{result.cycleCount}</strong> cycles. Your reports and predictions now use this history.
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
              fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-outfit)',
            }}>Done</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
