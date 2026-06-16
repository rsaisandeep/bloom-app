import { supabase } from './supabase';

export async function apiRegister(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) return { ok: false, error: 'An account with this email already exists.' };
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: 'Signup failed.' };

  // profiles.username stores email (unique); display name comes from auth metadata
  await supabase.from('profiles').insert({ id: data.user.id, username: email });
  return { ok: true };
}

export async function apiLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Invalid email or password.' };

  const user = data.user;
  const name = user?.user_metadata?.name ?? email.split('@')[0];
  if (typeof window !== 'undefined') localStorage.setItem('bloom_username', name);

  // Profile insert during signup is blocked when email is unconfirmed (RLS + no session).
  // Upsert here instead — user is now authenticated so RLS allows it.
  if (user) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!existing) {
      await supabase.from('profiles').insert({ id: user.id, username: email });
    }
  }

  return { ok: true };
}

export async function apiLogout() {
  localStorage.removeItem('bloom_username');
  await supabase.auth.signOut();
}
