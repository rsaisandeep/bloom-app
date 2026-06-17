import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Resolves a username to its account email server-side and signs in, so the
// email is never exposed to the browser (no username -> email harvesting).
// Returns only the session tokens; the client calls supabase.auth.setSession.
export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey || !url || !anonKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const { username, password } = await req.json().catch(() => ({ username: '', password: '' }));
  // Same generic message for every failure mode — no user enumeration.
  const bad = () => NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  if (!username || !password) return bad();

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('handle', String(username).toLowerCase())
    .maybeSingle();
  if (!profile) return bad();

  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(profile.id);
  const email = userRes?.user?.email;
  if (userErr || !email) return bad();

  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) return bad();

  return NextResponse.json({
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
  });
}
