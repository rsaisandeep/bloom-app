'use client';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { listPartners, respondInvite, setViewOwner, type PartnerLink } from '@/lib/partners';
import { fetchFromSheet } from '@/lib/data';

// Shown on the main tabs (Cycle / Calendar / Reports) for a viewer account that
// hasn't been added & accepted into a partner's data yet. Pending invites can be
// accepted right here; accepting enters read-only view mode for that partner.
export default function ViewerWaiting() {
  const [invites, setInvites] = useState<PartnerLink[]>([]);

  function load() {
    listPartners().then(({ iCanView }) => setInvites(iCanView.filter((p) => p.status === 'pending')));
  }
  useEffect(load, []);

  async function accept(inv: PartnerLink) {
    await respondInvite(inv.id, true);
    setViewOwner(inv.userId, inv.name || inv.handle || 'partner');
    await fetchFromSheet(inv.userId);
    window.location.href = '/'; // reload into view mode
  }
  async function decline(inv: PartnerLink) {
    await respondInvite(inv.id, false);
    load();
  }

  return (
    <>
      <TopBar />
      <div style={{ minHeight: 'calc(100dvh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 100px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>👀</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.3 }}>
          Nothing to view yet
        </h1>
        <p style={{ margin: 0, maxWidth: 320, fontSize: 14, color: '#8A6A9A', lineHeight: 1.6 }}>
          Ask your partner to add you by your username. Once she adds you, their cycle shows up here —
          you’ll get a notification to accept.
        </p>

        {invites.length > 0 && (
          <div style={{ width: '100%', maxWidth: 340, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="glass-card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', textAlign: 'left',
                background: 'linear-gradient(135deg,rgba(110,52,130,0.16),rgba(165,106,189,0.08))',
                borderColor: 'rgba(110,52,130,0.40)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1C0B2E' }}>
                    {inv.name || inv.handle || 'Someone'} invited you
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => accept(inv)} style={{
                      padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: '#6E3482', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)',
                    }}>Accept & view</button>
                    <button onClick={() => decline(inv)} style={{
                      padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer',
                      color: '#dc2626', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-outfit)',
                    }}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
