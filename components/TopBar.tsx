'use client';
import { useEffect, useState } from 'react';
import Hamburger from '@/components/Hamburger';
import InfoModal from '@/components/InfoModal';
import LogoutButton from '@/components/LogoutButton';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Hamburger username={username} />
        <InfoModal />
      </div>
      {title && (
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: 17, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.3,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{title}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoutButton />
      </div>
    </div>
  );
}
