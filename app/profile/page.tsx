'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getSettings, setPcosMode, setPaused, updateSettings, getGoals, loadData, deleteCycle, isLikelySkipped, type Cycle } from '@/lib/cycle';
import { fetchFromSheet } from '@/lib/data';
import TopBar from '@/components/TopBar';
const DoctorSummaryModal = dynamic(() => import('@/components/DoctorSummary'), { ssr: false });
const ImportSheet = dynamic(() => import('@/components/ImportSheet'), { ssr: false });
import { buildLogsCSV, downloadCSV } from '@/lib/export';
import { apiLogout } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from '@/lib/usePushNotifications';
import {
  getMyProfile, setAccountType, setGender, listPartners, invitePartner,
  respondInvite, removeLink, setViewOwner, clearViewOwner, isViewMode, getViewOwnerName,
  getCachedAccountType, type AccountType, type PartnerLink,
} from '@/lib/partners';

const GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
  { id: 'prefer_not', label: 'Prefer not to say' },
];

const NOTIF_CATEGORIES = [
  { id: 'log_reminder', label: 'Log reminder', sub: 'Daily nudge to log your symptoms' },
  { id: 'period_soon', label: 'Period alert', sub: 'Heads-up when your period is predicted soon' },
  { id: 'cycle_update', label: 'Cycle update', sub: 'Notification when your phase changes' },
];

const GOALS = [
  { id: 'track', emoji: '📅', label: 'Track my cycle', sub: 'Know where I am in my cycle' },
  { id: 'symptoms', emoji: '🩺', label: 'Manage symptoms', sub: 'PMS, cramps, mood swings' },
  { id: 'conceive', emoji: '🌱', label: 'Trying to conceive', sub: 'Fertility window tracking' },
  { id: 'wellness', emoji: '✨', label: 'General wellness', sub: 'Eat, move, and sleep better' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pcos, setPcos] = useState(false);
  const [paused, setPausedState] = useState(false);
  const [goals, setGoalsState] = useState<string[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { status: notifStatus, subscribe: notifSubscribe, unsubscribe: notifUnsubscribe } = usePushNotifications();
  const [categories, setCategories] = useState<string[]>(['log_reminder', 'period_soon', 'cycle_update']);

  // Partner mode
  const [accountType, setAccountTypeState] = useState<AccountType>(() => getCachedAccountType());
  const [gender, setGenderState] = useState<string>('');
  const [myViewers, setMyViewers] = useState<PartnerLink[]>([]);
  const [iCanView, setICanView] = useState<PartnerLink[]>([]);
  const [inviteHandle, setInviteHandle] = useState('');
  const [partnerMsg, setPartnerMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [viewing, setViewing] = useState(false);

  const refreshPartners = useCallback(async () => {
    const prof = await getMyProfile();
    if (prof) { setAccountTypeState(prof.accountType); setGenderState(prof.gender ?? ''); }
    const { myViewers, iCanView } = await listPartners();
    setMyViewers(myViewers);
    setICanView(iCanView);
  }, []);

  async function changeAccountType(type: AccountType) {
    setAccountTypeState(type);
    await setAccountType(type);
  }
  async function changeGender(g: string) {
    setGenderState(g);
    await setGender(g);
  }
  async function sendInvite() {
    const h = inviteHandle.trim().toLowerCase();
    if (!h) return;
    setPartnerMsg({ text: 'Sending…', err: false });
    const r = await invitePartner(h);
    if (r.ok) { setPartnerMsg({ text: 'Invite sent — they must accept.', err: false }); setInviteHandle(''); refreshPartners(); }
    else setPartnerMsg({ text: r.error ?? 'Could not send.', err: true });
  }
  async function accept(link: PartnerLink) { await respondInvite(link.id, true); refreshPartners(); }
  async function decline(link: PartnerLink) { await respondInvite(link.id, false); refreshPartners(); }
  async function unlink(link: PartnerLink) { await removeLink(link.id); refreshPartners(); }
  async function viewPartner(link: PartnerLink) {
    setViewOwner(link.userId, link.name || link.handle || 'partner');
    await fetchFromSheet(link.userId);
    router.push('/');
  }
  async function exitView() {
    clearViewOwner();
    await fetchFromSheet(); // reload my own data
    setViewing(false);
    router.push('/');
  }

  function syncLocal() {
    const s = getSettings();
    setPcos(!!s.pcosMode);
    setPausedState(!!s.paused);
    setGoalsState(getGoals(s));
    setCycles([...loadData().cycles].reverse()); // newest first
  }

  const loadCategories = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/push/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories ?? ['log_reminder', 'period_soon', 'cycle_update']);
    }
  }, []);

  useEffect(() => {
    if (notifStatus === 'subscribed') loadCategories();
  }, [notifStatus, loadCategories]);

  async function toggleNotif() {
    if (notifStatus === 'subscribed') {
      await notifUnsubscribe();
      setCategories(['log_reminder', 'period_soon', 'cycle_update']);
    } else {
      await notifSubscribe();
      loadCategories();
    }
  }

  async function toggleCategory(id: string) {
    const next = categories.includes(id)
      ? categories.filter(c => c !== id)
      : [...categories, id];
    setCategories(next);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/push/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ categories: next }),
    });
  }

  function toggleGoal(id: string) {
    const next = goals.includes(id) ? goals.filter(g => g !== id) : [...goals, id];
    setGoalsState(next);
    updateSettings({ goals: next, goal: next[0] }); // persist + keep legacy field
  }

  useEffect(() => {
    const u = localStorage.getItem('bloom_username');
    if (u) setUsername(u);
    setViewing(isViewMode());
    syncLocal();                          // instant from cache
    // In view mode the cache is the partner's data — don't overwrite it with mine.
    if (!isViewMode()) fetchFromSheet().then(syncLocal);
    refreshPartners();
  }, [refreshPartners]);

  function togglePcos() {
    const next = !pcos;
    setPcos(next);
    setPcosMode(next); // persists to cache + syncs to sheet
  }

  function togglePaused() {
    const next = !paused;
    setPausedState(next);
    setPaused(next);
  }

  function removeCycle(id: string) {
    deleteCycle(id);
    syncLocal();
  }

  const fmt = (s?: string) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  async function logout() {
    await apiLogout(); // handles redirect internally
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setDeleteError('Not logged in. Please refresh and try again.'); setDeleting(false); return; }
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Only trust a string error from the body; never render a raw object
        // (that's what produced the "{}" message). Fall back to the status code.
        let detail = '';
        try { const j = await res.json(); if (typeof j?.error === 'string') detail = j.error; } catch {}
        setDeleteError(detail || `Delete failed (${res.status}). Try again.`);
        setDeleting(false);
        return;
      }
      localStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Network error. Check your connection and try again.');
      setDeleting(false);
    }
  }

  const initial = username ? username[0].toUpperCase() : '🌸';
  const viewer = accountType === 'viewer';

  return (
    <><TopBar />
    <div style={{ minHeight: '100dvh', padding: '8px 20px 20px' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 26, fontWeight: 800, color: '#1C0B2E', letterSpacing: -0.5, textAlign: 'center' }}>
        Profile
      </h1>

      {/* View-mode banner */}
      {viewing && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '12px 16px', marginBottom: 12, borderRadius: 14,
          background: 'rgba(110,52,130,0.1)', border: '1px solid rgba(110,52,130,0.25)',
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6E3482' }}>
            👀 Viewing {getViewOwnerName()}’s data — read only
          </p>
          <button onClick={exitView} style={{
            padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#6E3482', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)',
          }}>Exit</button>
        </div>
      )}

      {/* Avatar */}
      <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: 28, fontWeight: 800, color: '#fff',
          boxShadow: '0 8px 24px rgba(110,52,130,0.35)',
        }}>
          {initial}
        </div>
        <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#1C0B2E' }}>{username}</p>
        <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A' }}>Bloom member</p>
      </div>

      {/* PCOS mode toggle */}
      {!viewer && <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>🩺</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>PCOS mode</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
                Softens predictions into a date range, since PCOS cycles vary in length.
              </p>
            </div>
          </div>
          {/* Switch */}
          <button onClick={togglePcos} role="switch" aria-checked={pcos} aria-label="PCOS mode" style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
            padding: 3, flexShrink: 0, position: 'relative',
            background: pcos ? 'linear-gradient(135deg,#6E3482,#A56ABD)' : 'rgba(165,106,189,0.25)',
            transition: 'background .25s cubic-bezier(.34,1.4,.64,1)',
            boxShadow: pcos ? '0 4px 12px rgba(110,52,130,0.3)' : 'none',
          }}>
            <span style={{
              display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transform: pcos ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
        {pcos && (
          <Link href="/read" style={{ textDecoration: 'none' }}>
            <p className="anim-rise" style={{
              margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: '#6E3482',
              padding: '8px 12px', borderRadius: 10, background: 'rgba(165,106,189,0.12)',
            }}>📖 Read our PCOS guides for food & tracking tips ›</p>
          </Link>
        )}
      </div>}

      {/* Pause tracking toggle */}
      {!viewer && <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18, marginTop: 1 }}>⏸️</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Pause tracking</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
                For pregnancy or a break — stops predictions & reminders. Logging a period resumes it.
              </p>
            </div>
          </div>
          <button onClick={togglePaused} role="switch" aria-checked={paused} aria-label="Pause tracking" style={{
            width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer',
            padding: 3, flexShrink: 0, position: 'relative',
            background: paused ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'rgba(165,106,189,0.25)',
            transition: 'background .25s cubic-bezier(.34,1.4,.64,1)',
            boxShadow: paused ? '0 4px 12px rgba(217,119,6,0.3)' : 'none',
          }}>
            <span style={{
              display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transform: paused ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>}

      {/* Notifications */}
      {!viewer && notifStatus !== 'unsupported' && (
        <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 18, marginTop: 1 }}>🔔</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Notifications</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
                  {notifStatus === 'denied'
                    ? 'Blocked — enable in browser settings'
                    : notifStatus === 'subscribed' ? 'On' : 'Off'}
                </p>
              </div>
            </div>
            {notifStatus !== 'denied' && (
              <button
                onClick={toggleNotif}
                role="switch"
                aria-checked={notifStatus === 'subscribed'}
                aria-label="Notifications"
                disabled={notifStatus === 'loading'}
                style={{
                  width: 50, height: 30, borderRadius: 999, border: 'none',
                  cursor: notifStatus === 'loading' ? 'default' : 'pointer',
                  padding: 3, flexShrink: 0,
                  background: notifStatus === 'subscribed'
                    ? 'linear-gradient(135deg,#6E3482,#A56ABD)'
                    : 'rgba(165,106,189,0.25)',
                  transition: 'background .25s cubic-bezier(.34,1.4,.64,1)',
                  boxShadow: notifStatus === 'subscribed' ? '0 4px 12px rgba(110,52,130,0.3)' : 'none',
                  opacity: notifStatus === 'loading' ? 0.6 : 1,
                }}>
                <span style={{
                  display: 'block', width: 24, height: 24, borderRadius: '50%', background: '#fff',
                  transform: notifStatus === 'subscribed' ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform .25s cubic-bezier(.34,1.56,.64,1)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }} />
              </button>
            )}
          </div>
          {notifStatus === 'subscribed' && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {NOTIF_CATEGORIES.map((cat, i) => {
                const on = categories.includes(cat.id);
                return (
                  <button key={cat.id} onClick={() => toggleCategory(cat.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderTop: i > 0 ? '1px solid rgba(165,106,189,0.12)' : '1px solid rgba(165,106,189,0.12)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: 'none', width: '100%', textAlign: 'left',
                    fontFamily: 'var(--font-outfit)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1C0B2E' }}>{cat.label}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{cat.sub}</p>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      border: on ? 'none' : '2px solid rgba(165,106,189,0.4)',
                      background: on ? '#6E3482' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Your goals */}
      {!viewer && <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Your goals</p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
          Pick all that apply — tailors your daily tasks and what your reports emphasise.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GOALS.map(g => {
            const on = goals.includes(g.id);
            return (
              <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
                borderRadius: 12, border: `1.5px solid ${on ? '#6E3482' : 'rgba(165,106,189,0.25)'}`,
                background: on ? 'rgba(110,52,130,0.12)' : 'transparent',
                cursor: 'pointer', fontFamily: 'var(--font-outfit)', textAlign: 'left', transition: 'all .2s',
              }}>
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: on ? '#6E3482' : '#1C0B2E' }}>{g.label}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{g.sub}</p>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: on ? 'none' : '2px solid rgba(165,106,189,0.4)',
                  background: on ? '#6E3482' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </button>
            );
          })}
        </div>
      </div>}

      {/* Partner mode — trackers only; viewers manage from the waiting screen */}
      {!viewer && <div className="glass-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>👥</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Partner mode</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
              Share read-only access with a partner, or view a partner’s cycle. They can see, never edit.
            </p>
          </div>
        </div>

        {/* Account type */}
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#49225B' }}>I am a…</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['tracker', 'viewer'] as AccountType[]).map(t => {
            const on = accountType === t;
            return (
              <button key={t} onClick={() => changeAccountType(t)} style={{
                flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                border: `1.5px solid ${on ? '#6E3482' : 'rgba(165,106,189,0.25)'}`,
                background: on ? 'rgba(110,52,130,0.12)' : 'transparent',
                color: on ? '#6E3482' : '#49225B', fontSize: 13, fontWeight: on ? 700 : 500,
              }}>{t === 'tracker' ? 'Tracker' : 'Viewer (partner)'}</button>
            );
          })}
        </div>

        {/* Gender */}
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#49225B' }}>Gender</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {GENDERS.map(g => {
            const on = gender === g.id;
            return (
              <button key={g.id} onClick={() => changeGender(g.id)} style={{
                padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-outfit)',
                border: `1.5px solid ${on ? '#6E3482' : 'rgba(165,106,189,0.25)'}`,
                background: on ? 'rgba(110,52,130,0.12)' : 'transparent',
                color: on ? '#6E3482' : '#49225B', fontSize: 12, fontWeight: on ? 700 : 500,
              }}>{g.label}</button>
            );
          })}
        </div>

        {/* Invite a viewer by username */}
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#49225B' }}>Add a partner who can view my data</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={inviteHandle} onChange={e => { setInviteHandle(e.target.value); setPartnerMsg(null); }}
            placeholder="their username" autoCapitalize="none"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(165,106,189,0.25)',
              borderRadius: 12, padding: '10px 12px', color: '#1C0B2E', fontSize: 14, outline: 'none',
              fontFamily: 'var(--font-outfit)', boxSizing: 'border-box',
            }} />
          <button onClick={sendInvite} style={{
            padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-outfit)', flexShrink: 0,
          }}>Add</button>
        </div>
        {partnerMsg && <p style={{ margin: '8px 0 0', fontSize: 12, color: partnerMsg.err ? '#dc2626' : '#6E3482' }}>{partnerMsg.text}</p>}

        {/* People who can view MY data */}
        {myViewers.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#49225B' }}>Can view my data</p>
            {myViewers.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: '#1C0B2E' }}>
                  {v.name || v.handle || 'user'}{v.handle ? ` · @${v.handle}` : ''}
                  <span style={{ fontSize: 11, fontWeight: 700, color: v.status === 'accepted' ? '#16a34a' : '#d97706', marginLeft: 8 }}>
                    {v.status === 'accepted' ? 'accepted' : 'pending'}
                  </span>
                </span>
                <button onClick={() => unlink(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {/* Partners whose data I can view */}
        {iCanView.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#49225B' }}>Partners I can view</p>
            {iCanView.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0' }}>
                <span style={{ fontSize: 13, color: '#1C0B2E' }}>
                  {p.name || p.handle || 'user'}{p.handle ? ` · @${p.handle}` : ''}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {p.status === 'pending' ? (
                    <>
                      <button onClick={() => accept(p)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#6E3482', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>Accept</button>
                      <button onClick={() => decline(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Decline</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => viewPartner(p)} style={{ padding: '6px 12px', borderRadius: 10, border: '1.5px solid rgba(110,52,130,0.35)', cursor: 'pointer', background: 'rgba(110,52,130,0.1)', color: '#6E3482', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>View</button>
                      <button onClick={() => unlink(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>Remove</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Re-setup cycle */}
      {!viewer && <Link href="/onboarding" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🗓</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Update cycle setup</p>
              <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>Change period date or cycle length</p>
            </div>
          </div>
          <span style={{ color: '#A56ABD', fontSize: 16 }}>→</span>
        </div>
      </Link>}

      {/* Cycle history */}
      {!viewer && cycles.length > 0 && (
        <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 12, overflow: 'visible' }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Cycle history</p>
          <div style={{ maxHeight: 320, overflowY: 'auto', overflowX: 'hidden' }}>
            {cycles.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i < cycles.length - 1 ? '1px solid rgba(165,106,189,0.12)' : 'none',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>
                    {fmt(c.startDate)}
                    {i === 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#6E3482', marginLeft: 8 }}>current</span>}
                    {isLikelySkipped(c.cycleLength) && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginLeft: 8 }}>⚠ skipped?</span>}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
                    {c.cycleLength ? `${c.cycleLength}-day cycle` : 'in progress'}
                    {c.periodLength ? ` · ${c.periodLength}-day period` : ''}
                  </p>
                </div>
                <button onClick={() => removeCycle(c.id)} aria-label="Delete cycle" style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                  border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(252,232,232,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your data — export + doctor summary. For a viewer this mirrors the
          partner's data currently loaded (read-only). */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>
          {viewer ? `${getViewOwnerName() ?? 'Partner'}’s data` : 'Your data'}
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
          {viewer
            ? 'Export their logs or generate a doctor-ready cycle summary.'
            : 'Export your logs or generate a doctor-ready cycle summary.'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowSummary(true)} style={{
            flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-outfit)',
          }}>📄 Doctor summary</button>
          <button onClick={() => downloadCSV(`bloom-logs-${new Date().toISOString().slice(0, 10)}.csv`, buildLogsCSV(loadData()))} style={{
            flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px solid rgba(165,106,189,0.35)', background: 'rgba(165,106,189,0.08)',
            color: '#6E3482', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-outfit)',
          }}>⬇ Export CSV</button>
        </div>
        {!viewer && (
          <button onClick={() => setShowImport(true)} style={{
            width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, cursor: 'pointer',
            border: '1.5px dashed rgba(165,106,189,0.45)', background: 'transparent',
            color: '#6E3482', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-outfit)',
          }}>⬆ Import from another app (Flo, Clue…)</button>
        )}
      </div>

      {/* App info */}
      <div className="glass-card" style={{ padding: '4px 18px', marginBottom: 12 }}>
        {[
          { label: 'Data storage', value: 'Supabase + Local cache' },
          { label: 'Privacy', value: 'Your data stays yours' },
          { label: 'Version', value: '1.0.0' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < 2 ? '1px solid rgba(165,106,189,0.12)' : 'none',
          }}>
            <span style={{ fontSize: 14, color: '#49225B', fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 12, color: '#8A6A9A' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <button onClick={logout} style={{
        width: '100%', padding: '14px', borderRadius: 16,
        border: '1.5px solid rgba(220,38,38,0.3)',
        background: 'rgba(252,232,232,0.65)',
        color: '#dc2626', fontSize: 15, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'var(--font-outfit)',
        backdropFilter: 'blur(14px)', letterSpacing: 0.3,
      }}>Log out</button>

      <button onClick={() => setShowDeleteModal(true)} style={{
        width: '100%', marginTop: 10, padding: '12px', borderRadius: 16,
        border: 'none', background: 'transparent',
        color: 'rgba(220,38,38,0.5)', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-outfit)',
      }}>Delete account</button>

      <DoctorSummaryModal open={showSummary} onClose={() => setShowSummary(false)} />
      <ImportSheet open={showImport} onClose={() => setShowImport(false)} onImported={() => fetchFromSheet().then(syncLocal)} />

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#1C0B2E', borderRadius: 24, padding: 28, border: '1px solid rgba(220,38,38,0.35)' }}>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center' }}>Delete account?</h3>
            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
              This permanently deletes your account and all data — cycles, logs, and settings. This cannot be undone.
            </p>
            <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Type <strong style={{ color: '#ff6b6b' }}>DELETE</strong> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={{
                width: '100%', boxSizing: 'border-box', marginBottom: 16,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 15,
                outline: 'none', fontFamily: 'var(--font-outfit)',
              }}
            />
            {deleteError && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#ff6b6b', textAlign: 'center' }}>{deleteError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteError(''); }} style={{
                flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(165,106,189,0.3)',
                background: 'transparent', color: '#A56ABD', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-outfit)',
              }}>Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting} style={{
                flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                background: deleteConfirmText === 'DELETE' && !deleting ? 'linear-gradient(135deg,#dc2626,#9d174d)' : 'rgba(220,38,38,0.25)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: deleteConfirmText === 'DELETE' && !deleting ? 'pointer' : 'default',
                fontFamily: 'var(--font-outfit)',
              }}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
