'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { spring } from '@/lib/motion';
import { fetchTaskDone, saveTaskDone } from '@/lib/tasks';
import { listPartners } from '@/lib/partners';
import { PARTNER_CONCEIVE_TASKS as TASKS, type ConceiveTask } from '@/lib/conceiveTasks';

// Partner support tasks for "trying to conceive".
//  - mode="viewer": the partner sees the full list and can tick items off.
//    Ticks are saved to their own task_completions row for the day.
//  - mode="tracker": the tracker sees a compact preview (first few) of what
//    their partner has ticked today, read-only; tapping expands the full list
//    in a popup. Renders nothing until an accepted viewer + their row are found.
export default function PartnerTasks({ mode, todayKey }: { mode: 'viewer' | 'tracker'; todayKey: string }) {
  const [done, setDone] = useState<number[]>([]);
  const [viewerName, setViewerName] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [ready, setReady] = useState(mode === 'viewer');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (mode === 'viewer') {
      fetchTaskDone(todayKey).then((d) => { if (alive && d) setDone(d); });
    } else {
      listPartners().then(({ myViewers }) => {
        const v = myViewers.find((p) => p.status === 'accepted');
        if (!alive || !v) { setReady(true); return; }
        setViewerId(v.userId);
        setViewerName(v.name || v.handle || 'Your partner');
        fetchTaskDone(todayKey, v.userId).then((d) => { if (alive) { if (d) setDone(d); setReady(true); } });
      }).catch(() => { if (alive) setReady(true); });
    }
    return () => { alive = false; };
  }, [mode, todayKey]);

  function toggle(i: number) {
    if (mode !== 'viewer') return;
    setDone((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      saveTaskDone(todayKey, next).catch(() => {});
      return next;
    });
  }

  // Tracker: wait until we know there's a viewer with a row before showing.
  if (mode === 'tracker' && (!ready || !viewerId)) return null;

  const count = done.length;
  const total = TASKS.length;
  const title = mode === 'viewer' ? 'Your support tasks' : `${viewerName}’s support tasks`;

  return (
    <div className="anim-rise" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{title}</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
            {count}/{total} done today · trying to conceive
          </p>
        </div>
        {mode === 'tracker' && (
          <button onClick={() => setOpen(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 12, fontWeight: 700, color: '#A56ABD', fontFamily: 'var(--font-outfit)',
          }}>See all ›</button>
        )}
      </div>

      {/* Viewer: full editable list. Tracker: compact read-only preview. */}
      <div className="glass-card stagger" style={{ padding: '6px 8px' }}>
        {(mode === 'viewer' ? TASKS : TASKS.slice(0, 4)).map((t, i) => (
          <TaskRow key={i} t={t} done={done.includes(i)} editable={mode === 'viewer'}
            last={i === (mode === 'viewer' ? TASKS.length : 4) - 1} onClick={() => toggle(i)} />
        ))}
        {mode === 'tracker' && (
          <button onClick={() => setOpen(true)} style={{
            width: '100%', padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: '#6E3482', fontFamily: 'var(--font-outfit)',
          }}>+{total - 4} more · tap to view all</button>
        )}
      </div>

      {/* Tracker popup: full read-only list */}
      {mode === 'tracker' && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 20,
                background: 'rgba(28,11,46,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 12 }}
                transition={spring}
                className="glass-card"
                style={{
                  width: '100%', maxWidth: 420, maxHeight: '80dvh', overflowY: 'auto',
                  background: 'rgba(255,255,255,0.97)', borderRadius: 28, padding: '20px 18px',
                  boxShadow: '0 24px 70px rgba(28,11,46,0.4)',
                }}
              >
                <p style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>{title}</p>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#8A6A9A' }}>{count}/{total} done today · read-only</p>
                {TASKS.map((t, i) => (
                  <TaskRow key={i} t={t} done={done.includes(i)} editable={false} last={i === TASKS.length - 1} />
                ))}
                <button onClick={() => setOpen(false)} style={{
                  marginTop: 16, width: '100%', padding: '12px', borderRadius: 14, border: 'none',
                  background: 'rgba(110,52,130,0.12)', color: '#6E3482', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                }}>Close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function TaskRow({ t, done, editable, last, onClick }: { t: ConceiveTask; done: boolean; editable: boolean; last: boolean; onClick?: () => void }) {
  return (
    <button onClick={editable ? onClick : undefined} disabled={!editable} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px',
      background: 'none', border: 'none', cursor: editable ? 'pointer' : 'default',
      borderBottom: last ? 'none' : '1px solid rgba(165,106,189,0.12)',
      textAlign: 'left', fontFamily: 'var(--font-outfit)',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0, opacity: done ? 0.45 : 1, transition: 'opacity .2s' }}>{t.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: done ? '#A99BB5' : '#1C0B2E', textDecoration: done ? 'line-through' : 'none', transition: 'all .2s' }}>{t.title}</p>
        <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A', textDecoration: done ? 'line-through' : 'none' }}>{t.sub}</p>
      </div>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        border: done ? 'none' : '2px solid rgba(165,106,189,0.45)',
        background: done ? 'linear-gradient(135deg,#6E3482,#A56ABD)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .25s cubic-bezier(.22,1.12,.4,1)', transform: done ? 'scale(1.04)' : 'scale(1)',
        boxShadow: done ? '0 4px 12px rgba(110,52,130,0.35)' : 'none',
      }}>
        {done && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}
