'use client';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { listPartners, respondInvite, setViewOwner, type PartnerLink } from '@/lib/partners';
import { fetchFromSheet } from '@/lib/data';

// Shown on the main tabs (Cycle / Calendar / Reports) for a viewer account that
// hasn't been added & accepted into a partner's data yet. Pending invites can be
// accepted right here; accepting enters read-only view mode for that partner.
export default function ViewerWaiting() {
  const [links, setLinks] = useState<PartnerLink[] | null>(null); // null = still loading
  const [restoring, setRestoring] = useState(false);

  function load() {
    listPartners().then(({ iCanView }) => {
      setLinks(iCanView);
      // Auto-resume: logout wipes the local view selection, but the accepted link
      // lives in the DB. If there's exactly one accepted partner, re-enter their
      // view automatically instead of making the user pick again every login.
      const acc = iCanView.filter((p) => p.status === 'accepted');
      if (acc.length === 1) { setRestoring(true); enterView(acc[0]); }
    });
  }
  useEffect(() => { load(); }, []);

  const pending = (links ?? []).filter((p) => p.status === 'pending');
  const accepted = (links ?? []).filter((p) => p.status === 'accepted');

  async function enterView(p: PartnerLink) {
    setViewOwner(p.userId, p.name || p.handle || 'partner');
    await fetchFromSheet(p.userId);
    window.location.href = '/'; // reload into view mode
  }
  async function accept(inv: PartnerLink) {
    await respondInvite(inv.id, true);
    await enterView(inv);
  }
  async function decline(inv: PartnerLink) {
    await respondInvite(inv.id, false);
    load();
  }

  // While loading the link list (or auto-resuming a single partner), show a quiet
  // placeholder so the "ask your partner" message doesn't flash.
  if (links === null || restoring) {
    return (
      <>
        <TopBar />
        <div style={{ minHeight: 'calc(100dvh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 14, color: '#8A6A9A' }}>Loading…</p>
        </div>
      </>
    );
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

        {(pending.length > 0 || accepted.length > 0) && (
          <div style={{ width: '100%', maxWidth: 340, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((inv) => (
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
            {accepted.map((p) => (
              <div key={p.id} className="glass-card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', textAlign: 'left',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🌸</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1C0B2E' }}>
                    {p.name || p.handle || 'Partner'}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 11.5, color: '#8A6A9A' }}>Tap to view their cycle</p>
                </div>
                <button onClick={() => enterView(p)} style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: '#6E3482', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)',
                }}>View</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
