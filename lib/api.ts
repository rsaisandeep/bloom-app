import { supabase } from './supabase';

export async function apiRegister(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) return { ok: false, error: 'An account with this email already exists.' };
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: 'Signup failed.' };

  await supabase.from('profiles').insert({ id: data.user.id, username: email });
  return { ok: true };
}

export async function apiLogin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Invalid email or password.' };
  return { ok: true };
}

export async function apiLogout() {
  localStorage.removeItem('bloom_username');
  await supabase.auth.signOut();
}
