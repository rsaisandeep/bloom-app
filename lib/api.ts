import { supabase } from './supabase';

const toEmail = (username: string) => `${username}@bloom.app`;

export async function apiRegister(username: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username } },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('taken')) return { ok: false, error: 'Username already taken.' };
    return { ok: false, error: error.message };
  }
  if (!data.user) return { ok: false, error: 'Signup failed.' };

  await supabase.from('profiles').insert({ id: data.user.id, username });
  return { ok: true };
}

export async function apiLogin(username: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) return { ok: false, error: 'Invalid username or password.' };
  return { ok: true };
}

export async function apiLogout() {
  localStorage.removeItem('bloom_username');
  await supabase.auth.signOut();
}
