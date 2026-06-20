'use client';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { usePathname } from 'next/navigation';
import { pageVariants } from '@/lib/motion';

// Layout-level wrapper: re-keys on route change so every App Router navigation
// gets one identical spring enter (slight upward translate + fade). Reduced
// motion is honored globally by motion via the user's OS setting.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    // reducedMotion="user" makes every spring/transform (here + Button/Card
    // primitives) honor the OS "reduce motion" setting automatically.
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
          style={{ willChange: 'transform, opacity' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
