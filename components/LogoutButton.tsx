'use client';
import { useState } from 'react';
import { apiLogout } from '@/lib/api';

export default function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    await apiLogout();
    // apiLogout does window.location.replace('/login') — component unmounts here
  }

  return (
    <button onClick={handleLogout} aria-label="Log out" className="liquid-pill" style={{
      width: 38, height: 38, borderRadius: '50%', cursor: busy ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: busy ? 0.7 : 1,
    }}>
      {busy ? (
        /* Spinner ring */
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          style={{ animation: 'spinSlow .75s linear infinite', transformOrigin: 'center' }}>
          <circle cx="12" cy="12" r="9" stroke="rgba(110,52,130,0.25)" strokeWidth="2.2" />
          <path d="M12 3a9 9 0 0 1 9 9" stroke="#6E3482" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            stroke="#6E3482" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
