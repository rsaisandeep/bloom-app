import { supabase } from './supabase';

// ── View context (which owner a viewer is currently looking at) ──
// Persisted so the whole app renders the partner's data read-only. Pure viewers
// have no data of their own, so loading an owner's data into the local cache is
// fine; a dual-role user's own data re-loads when they switch back to self.
const VIEW_KEY = 'bloom_view_owner';      // owner user_id being viewed
const VIEW_NAME_KEY = 'bloom_view_name';  // owner display name/handle (for the banner)

export function getViewOwner(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VIEW_KEY);
}
export function getViewOwnerName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VIEW_NAME_KEY);
}
export function isViewMode(): boolean {
  return !!getViewOwner();
}
export function setViewOwner(userId: string, name: string) {
  localStorage.setItem(VIEW_KEY, userId);
  localStorage.setItem(VIEW_NAME_KEY, name);
}
export function clearViewOwner() {
  localStorage.removeItem(VIEW_KEY);
  localStorage.removeItem(VIEW_NAME_KEY);
}

// ── Self profile (account_type + gender) — RLS allows updating your own row ──
export type AccountType = 'tracker' | 'viewer';

export async function getMyProfile(): Promise<{ handle: string | null; accountType: AccountType; gender: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('handle, account_type, gender').eq('id', user.id).maybeSingle();
  return {
    handle: data?.handle ?? null,
    accountType: (data?.account_type as AccountType) ?? 'tracker',
    gender: data?.gender ?? null,
  };
}

export async function setAccountType(type: AccountType) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ account_type: type }).eq('id', user.id);
}

export async function setGender(gender: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ gender }).eq('id', user.id);
}

// ── Partner-link management (via the service-role API route) ──
async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: 'Not logged in.' };
  const res = await fetch('/api/partner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...body } : { ok: false, error: body.error ?? 'Something went wrong.' };
}

export interface PartnerLink {
  id: string;            // partner_links.id
  userId: string;        // the other party's user id
  status: 'pending' | 'accepted';
  handle: string | null;
  name: string | null;
}

export function invitePartner(handle: string) {
  return call('invite', { handle });
}
export async function listPartners(): Promise<{ myViewers: PartnerLink[]; iCanView: PartnerLink[] }> {
  const r = await call('list');
  if (!r.ok) return { myViewers: [], iCanView: [] };
  return { myViewers: r.myViewers ?? [], iCanView: r.iCanView ?? [] };
}
export function respondInvite(linkId: string, accept: boolean) {
  return call('respond', { linkId, accept });
}
export function removeLink(linkId: string) {
  return call('remove', { linkId });
}
