'use client';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { spring } from '@/lib/motion';
import { CHANGELOG } from '@/lib/changelog';

// "What's new" bottom sheet — opened from the menu. Lists every feature,
// newest release first.
export default function ChangelogSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(28,11,46,0.45)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 600,
            }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring}
            style={{
              position: 'fixed', bottom: 0, left: '50%', x: '-50%', width: '100%', maxWidth: 448,
              background: 'linear-gradient(180deg,#EEE8F5 0%,#E4DCF0 100%)',
              borderRadius: '28px 28px 0 0', zIndex: 601, maxHeight: '88dvh', overflowY: 'auto',
              overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <div style={{
              position: 'sticky', top: 0, zIndex: 1, padding: '12px 18px 12px',
              background: 'rgba(238,232,245,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '28px 28px 0 0',
            }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(110,52,130,0.2)', margin: '0 auto 12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1C0B2E' }}>✨ What’s new</h2>
                <button onClick={onClose} aria-label="Close" style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(110,52,130,0.1)', color: '#6E3482', fontSize: 16, fontFamily: 'var(--font-outfit)',
                }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '8px 18px 0' }}>
              {CHANGELOG.map((e) => (
                <div key={e.version} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <span className="pill" style={{ background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff', padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>v{e.version}</span>
                    <span style={{ fontSize: 11.5, color: '#8A6A9A', fontWeight: 600 }}>{e.date}</span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{e.title}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {e.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <span style={{ color: '#A56ABD', fontSize: 13, lineHeight: 1.5, flexShrink: 0 }}>●</span>
                        <p style={{ margin: 0, fontSize: 13.5, color: '#49225B', lineHeight: 1.5 }}>{it}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
