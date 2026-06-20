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
    let scroller: HTMLElement | null = null;

    // Find the nearest ancestor that scrolls on its own (e.g. the fixed article
    // overlay). The document body's scrollY stays 0 while these scroll, so without
    // this we'd preventDefault and trap the user's gesture inside them.
    const scrollableAncestor = (el: EventTarget | null): HTMLElement | null => {
      let node = el as HTMLElement | null;
      while (node && node !== document.body) {
        const oy = getComputedStyle(node).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    };

    const onStart = (e: TouchEvent) => {
      scroller = scrollableAncestor(e.target);
      const atTop = window.scrollY === 0 && (!scroller || scroller.scrollTop <= 0);
      if (atTop) { startY = e.touches[0].clientY; active = true; }
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      // If the page (or an inner scroller) has scrolled away from the very top,
      // disengage immediately so we never preventDefault and trap the user's
      // scroll (e.g. at the bottom of an article).
      if (window.scrollY > 0 || (scroller && scroller.scrollTop > 0)) { active = false; setSnap(true); setPullY(0); return; }
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

      setPullY(prev => {
        if (prev >= THRESHOLD && !busyRef.current) {
          busyRef.current = true;
          setRefreshing(true);
          window.dispatchEvent(new CustomEvent('bloom:refresh'));
          setTimeout(() => {
            busyRef.current = false;
            setRefreshing(false);
            // Only NOW snap back — after refresh is done
            setSnap(true);
            setPullY(0);
          }, 1500);
          return prev; // freeze in place — no upward movement until refresh completes
        }
        // Below threshold: snap back immediately
        setSnap(true);
        return 0;
      });
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [disabled]);

  if (disabled) return <>{children}</>;

  const progress = Math.min(pullY / THRESHOLD, 1);
  // Spinner centered in gap — gap = pullY (frozen at release pos while refreshing)
  const spinnerY = Math.max(pullY / 2 - 15, -20);
  const showSpinner = pullY > 5 || refreshing;

  return (
    <>
      {/* Spinner lives in the gap BEHIND the sliding content */}
      {showSpinner && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', zIndex: 90,
          transform: `translateX(-50%) translateY(${spinnerY}px)`,
          transition: snap ? `transform 0.38s ${EASE}` : 'none',
          pointerEvents: 'none',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{
            display: 'block',
            animation: refreshing ? 'spinSlow .7s linear infinite' : undefined,
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
          }}>
            <circle cx="12" cy="12" r="9" stroke="rgba(110,52,130,0.18)" strokeWidth="2.4" />
            <path d="M12 3a9 9 0 0 1 9 9" stroke="#6E3482" strokeWidth="2.4" strokeLinecap="round"
              style={{ opacity: refreshing ? 1 : Math.max(progress, 0.25) }} />
          </svg>
        </div>
      )}

      {/* Sliding content — header inside here moves with the pull */}
      {/* Only apply transform/willChange during active pull or snap — at rest these
          create a stacking context that breaks position:fixed in children */}
      <div style={{
        transform: (pullY > 0 || snap) ? `translateY(${pullY}px)` : undefined,
        transition: snap ? `transform 0.38s ${EASE}` : 'none',
        willChange: (pullY > 0 || snap) ? 'transform' : undefined,
      }}>
        {children}
      </div>
    </>
  );
}
