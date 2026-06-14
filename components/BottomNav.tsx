'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#6E3482' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"
        fill={active ? 'rgba(110,52,130,0.12)' : 'none'} />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const c = active ? '#6E3482' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3"
        stroke={c} strokeWidth="1.8"
        fill={active ? 'rgba(110,52,130,0.12)' : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? '#6E3482' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8"
        fill={active ? 'rgba(110,52,130,0.12)' : 'none'} />
      <path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20"
        stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 448,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(165,106,189,0.12)',
      zIndex: 200,
      boxShadow: '0 -4px 24px rgba(110,52,130,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px' }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '2px 28px', textDecoration: 'none', position: 'relative',
            }}>
              {active && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  width: 24, height: 3, borderRadius: 2,
                  background: 'linear-gradient(90deg,#6E3482,#A56ABD)',
                }} />
              )}
              <Icon active={active} />
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                color: active ? '#6E3482' : '#9CA3AF', letterSpacing: 0.3,
                fontFamily: 'var(--font-outfit)',
              }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
