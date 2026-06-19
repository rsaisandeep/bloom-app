'use client';
import { useEffect, useState } from 'react';
import Hamburger from '@/components/Hamburger';
import InfoModal from '@/components/InfoModal';
import { apiLogout } from '@/lib/api';

export default function TopBar({ title }: { title?: string }) {
  const [username, setUsername] = useState('');
  useEffect(() => {
    setUsername(localStorage.getItem('bloom_username') || '');
  }, []);
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px 10px',
      background: 'rgba(238,232,245,0.88)',
      backdropFilter: 'blur(20px) saturate(150%)',
      WebkitBackdropFilter: 'blur(20px) saturate(150%)',
      borderBottom: '1px solid rgba(165,106,189,0.12)',
    }}>
      <Hamburger username={username} />
      {title && (
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.3,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{title}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <InfoModal />
        <button onClick={() => apiLogout()} aria-label="Log out" className="liquid-pill" style={{
          width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#6E3482" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
