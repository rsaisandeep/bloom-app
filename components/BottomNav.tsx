'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function CycleIcon({ c }: { c: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 12a9 9 0 1 1-3.6-7.2" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M21 4v4h-4" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.4" fill={c} />
    </svg>
  );
}
function CalendarIcon({ c }: { c: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4.5" width="18" height="16.5" rx="4" stroke={c} strokeWidth="1.9" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" stroke={c} strokeWidth="1.9" />
      <line x1="8" y1="2.5" x2="8" y2="6" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
      <line x1="16" y1="2.5" x2="16" y2="6" stroke={c} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
function ReportsIcon({ c }: { c: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={c} strokeWidth="1.9" />
      <line x1="8" y1="15" x2="8" y2="11" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="12" y1="15" x2="12" y2="8" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="15" x2="16" y2="12.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function ReadIcon({ c }: { c: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5V5.5Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5V5.5Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

const TABS = [
  { href: '/', label: 'Cycle', Icon: CycleIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/reports', label: 'Reports', Icon: ReportsIcon },
  { href: '/read', label: 'Read', Icon: ReadIcon },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav style={{
      position: 'fixed',
      bottom: 'calc(12px + env(safe-area-inset-bottom))',
      left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)', maxWidth: 424,
      background: 'rgba(250,246,252,0.86)',
      backdropFilter: 'blur(34px) saturate(180%)', WebkitBackdropFilter: 'blur(34px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.85)',
      borderRadius: 28,
      zIndex: 200,
      boxShadow: '0 12px 40px rgba(110,52,130,0.20), inset 0 1px 0 rgba(255,255,255,0.95)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 6px' }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href;
          const c = active ? '#6E3482' : '#A99BB5';
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '6px 14px', textDecoration: 'none', position: 'relative',
              borderRadius: 18,
              background: active ? 'linear-gradient(135deg,rgba(165,106,189,0.20),rgba(110,52,130,0.10))' : 'transparent',
              transition: 'background .3s cubic-bezier(.34,1.4,.64,1)',
            }}>
              <Icon c={c} />
              <span style={{
                fontSize: 10, fontWeight: active ? 800 : 600,
                color: c, letterSpacing: 0.2, fontFamily: 'var(--font-outfit)',
              }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
