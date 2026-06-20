// Shared motion system — one source of truth so every page/primitive uses
// identical physics. Target feel: UIKit/SwiftUI spring — quick, subtly
// overshooting, settling smoothly. NOT bouncy, NOT linear, NOT long.
import type { Transition, Variants } from 'motion/react';

// Core spring used everywhere. stiffness ~260 / damping ~30 settles in ~0.35s
// with a barely-perceptible overshoot (critically-damped-ish).
export const spring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 1,
};

// Snappier spring for press/release on taps — faster settle, no overshoot wobble.
export const pressSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};

// Page transition: enter with slight upward translate + fade.
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
};

// Tap/press: scale down on press, spring back on release. No opacity flicker.
export const tap = { scale: 0.96 } as const;

// Subtle lift on hover — pointer devices only (guard at call site with media query
// or rely on motion's whileHover, which no-ops on touch).
export const hoverLift = { scale: 1.02, y: -2 } as const;
