'use client';
import { useEffect, useState } from 'react';
import Hamburger from '@/components/Hamburger';
import InfoModal from '@/components/InfoModal';

// Shared top bar: hamburger (left) + info (right). Used on every page.
export default function TopBar() {
  const [username, setUsername] = useState('');
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem('bloom_session') || '{}'); setUsername(s.username || ''); } catch {}
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 2px' }}>
      <Hamburger username={username} />
      <InfoModal />
    </div>
  );
}
