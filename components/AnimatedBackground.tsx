'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { loadData, getCurrentPhase, PHASE_ACCENT, type Phase } from '@/lib/cycle';

// Apple-Sports-style full-screen theming: the whole app background crossfades to
// the current cycle phase's accent. Sits behind all content (negative z-index,
// non-interactive). Re-derives the phase on navigation and whenever local data
// changes (saveData emits `bloom:data`). Falls back to the neutral body gradient
// when there's no cycle data yet (returns null → body's own gradient shows).
export default function AnimatedBackground() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const update = () => {
      try {
        const data = loadData();
        setPhase(data.cycles.length ? getCurrentPhase(data).phase : null);
      } catch {
        setPhase(null);
      }
    };
    update();
    window.addEventListener('bloom:data', update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener('bloom:data', update);
      window.removeEventListener('focus', update);
    };
  }, [pathname]);

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
      <AnimatePresence>
        {phase && (
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0, background: PHASE_ACCENT[phase].gradient }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
