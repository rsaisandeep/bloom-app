import { supabase } from './supabase';
import { cacheAccountType, type AccountType } from './partners';

// Username rules: lowercase letters/digits/underscore, 3–20 chars.
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('handle_available', { p_handle: handle.toLowerCase() });
  // Fail closed: if the check errors, treat as unavailable so we never create a dup.
  if (error) return false;
  return data === true;
}

export async function apiRegister(name: string, handle: string, email: string, password: string, accountType: AccountType = 'tracker') {
  const h = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return { ok: false, error: 'Username must be 3–20 letters, numbers or underscores.' };
  if (!(await isHandleAvailable(h))) return { ok: false, error: 'That username is taken.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Stash handle + account_type in user_metadata so they survive until the
    // profile row is created — when email confirmation is ON there's no session
    // at signup, so the profile is written on first login instead.
    options: { data: { name, handle: h, account_type: accountType } },
  });
  if (error) {
    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) return { ok: false, error: 'An account with this email already exists.' };
    if (msg.includes('smtp') || msg.includes('email') || msg.includes('send')) return { ok: false, error: 'Failed to send verification email. Please try again later.' };
    return { ok: false, error: error.message || 'Registration failed. Please try again.' };
  }
  if (!data.user) return { ok: false, error: 'Signup failed.' };

  if (typeof window !== 'undefined') localStorage.setItem('bloom_username', name);

  // With "Confirm email" disabled, signUp returns an active session immediately,
  // so the user is authenticated and we can create their profile row now.
  // (When confirmation is on, data.session is null and the profile is created
  // on first login instead — RLS blocks the insert without a session.)
  if (data.session) {
    await supabase.from('profiles').insert({ id: data.user.id, username: email, handle: h, account_type: accountType });
    cacheAccountType(accountType);
  }
  return { ok: true, session: !!data.session };
}

// Shared post-sign-in work: ensure a profile row exists (carrying the handle
// from user_metadata for accounts created under email confirmation), cache the
// display name, and report the account's handle so callers can prompt legacy
// users (registered before usernames) to pick one.
async function afterSignIn(): Promise<{ handle: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? '';
  const name = user?.user_metadata?.name ?? email.split('@')[0];
  if (typeof window !== 'undefined') localStorage.setItem('bloom_username', name);

  let handle: string | null = null;
  if (user) {
    const { data: existing } = await supabase.from('profiles').select('handle, account_type').eq('id', user.id).maybeSingle();
    if (existing) {
      handle = existing.handle ?? null;
      cacheAccountType((existing.account_type as AccountType) ?? 'tracker');
    } else {
      // First login after confirmed signup: create the profile, carrying the
      // handle + account_type the user chose at registration (in user_metadata).
      const metaHandle = (user.user_metadata?.handle as string | undefined) ?? null;
      const metaType = (user.user_metadata?.account_type as AccountType | undefined) ?? 'tracker';
      await supabase.from('profiles').insert({ id: user.id, username: email, handle: metaHandle, account_type: metaType });
      handle = metaHandle;
      cacheAccountType(metaType);
    }
  }
  return { handle };
}

export async function apiLogin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Invalid email or password.' };
  const { handle } = await afterSignIn();
  return { ok: true, handle };
}

export async function apiLoginByUsername(username: string, password: string) {
  let res: Response;
  try {
    res = await fetch('/api/login-by-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error ?? 'Invalid username or password.' };

  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) return { ok: false, error: 'Invalid username or password.' };

  const { handle } = await afterSignIn();
  return { ok: true, handle };
}

export async function apiSetHandle(handle: string) {
  const h = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(h)) return { ok: false, error: 'Username must be 3–20 letters, numbers or underscores.' };
  if (!(await isHandleAvailable(h))) return { ok: false, error: 'That username is taken.' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Please log in again.' };

  const { error } = await supabase.from('profiles').update({ handle: h }).eq('id', user.id);
  // Unique index can still reject a race between the check and the write.
  if (error) return { ok: false, error: 'That username is taken.' };
  return { ok: true };
}

export async function apiLogout() {
  // scope:'local' clears the session without a network round-trip — global
  // signOut can hang/reject on mobile and block everything below it.
  try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
  try {
    // Defensive: explicitly remove every Supabase auth token + app cache.
    // If even one sb-*-auth-token survives, AuthGuard sees a session on
    // /login and bounces straight back to home.
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') || k.startsWith('bloom'))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.clear();
    sessionStorage.clear();
  } catch {}

  // Force-clear ALL other browser storage so no user data lingers after logout.
  // Cache Storage holds PWA service-worker page caches; IndexedDB and cookies
  // are cleared defensively. Each is wrapped so one failure can't block logout.
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}
  try {
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      await Promise.all(
        dbs.map((d) =>
          d.name
            ? new Promise<void>((res) => {
                const req = indexedDB.deleteDatabase(d.name!);
                req.onsuccess = req.onerror = req.onblocked = () => res();
              })
            : Promise.resolve()
        )
      );
    }
  } catch {}
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  } catch {}

  // Full document reload so the supabase client re-initializes with no session.
  window.location.replace('/login');
}
