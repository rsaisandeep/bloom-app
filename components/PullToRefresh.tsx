'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const THRESHOLD = 65;
const HOLD_Y = 54;
const EASE = 'cubic-bezier(0.22,0.61,0.36,1)';
const SKIP = ['/login', '/onboarding'];

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [snap, setSnap] = useState(false);
  const busyRef = useRef(false);

  const disabled = SKIP.includes(pathname);

  useEffect(() => {
    if (disabled) return;

    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY === 0) { startY = e.touches[0].clientY; active = true; }
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 4) {
        e.preventDefault();
        setSnap(false);
        setPullY(Math.min(dy * 0.5, THRESHOLD + 20));
      } else if (dy < -2) {
        active = false;
        setSnap(true);
        setPullY(0);
      }
    };

    const onEnd = () => {
      if (!active) return;
      active = false;
      startY = 0;
      setSnap(true);

      setPullY(prev => {
        if (prev >= THRESHOLD && !busyRef.current) {
          busyRef.current = true;
          setRefreshing(true);
          window.dispatchEvent(new CustomEvent('bloom:refresh'));
          setTimeout(() => {
            busyRef.current = false;
            setRefreshing(false);
            setSnap(true);
            setPullY(0);
          }, 1500);
          return HOLD_Y;
        }
        return 0;
      });
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [disabled]);

  if (disabled) return <>{children}</>;

  const progress = Math.min(pullY / THRESHOLD, 1);
  // Flower sits centered in the gap: gap = pullY, center = pullY/2, offset for 30px icon = -15
  const flowerY = refreshing ? HOLD_Y / 2 - 15 : Math.max(pullY / 2 - 15, -20);
  const showFlower = pullY > 5 || refreshing;

  return (
    <>
      {/* Flower lives in the gap BEHIND the sliding content */}
      {showFlower && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', zIndex: 90,
          transform: `translateX(-50%) translateY(${flowerY}px)`,
          transition: snap ? `transform 0.38s ${EASE}` : 'none',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 30, display: 'inline-block',
            animation: refreshing ? 'spinSlow .75s linear infinite' : undefined,
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}>🌸</span>
        </div>
      )}

      {/* Sliding content — header inside here moves with the pull */}
      <div style={{
        transform: `translateY(${pullY}px)`,
        transition: snap ? `transform 0.38s ${EASE}` : 'none',
        willChange: 'transform',
      }}>
        {children}
      </div>
    </>
  );
}
