'use client';
import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'motion/react';

// Rolling count-up — springs from 0 → value on mount and re-springs on change.
// The signature "alive" move from the reference shot. Honors reduced motion
// (useSpring jumps instantly under MotionConfig reducedMotion="user").
export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  // Lively-but-tasteful: visible roll (~0.6s) with a touch of settle, no wobble.
  const spring = useSpring(mv, { stiffness: 120, damping: 22, mass: 1 });

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  useEffect(() => {
    const render = (v: number) =>
      ref.current && (ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`);
    render(spring.get());
    return spring.on('change', render);
  }, [spring, decimals, prefix, suffix]);

  return (
    <span ref={ref} className={className} style={style}>
      {`${prefix}${value.toFixed(decimals)}${suffix}`}
    </span>
  );
}
