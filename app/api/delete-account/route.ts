import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured: missing service key. Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars.' }, { status: 500 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const uid = user.id;

  // FKs may not cascade, so delete child data first or the profile/user delete
  // is rejected by the database. Order matters: children -> profile -> auth user.
  const fails: string[] = [];
  const errMsg = (e: unknown) => {
    const o = e as { message?: string; code?: string; details?: string };
    return o?.message || o?.details || o?.code || JSON.stringify(e) || 'unknown error';
  };

  for (const table of ['daily_logs', 'cycles', 'settings', 'push_subscriptions']) {
    const { error: e } = await adminClient.from(table).delete().eq('user_id', uid);
    if (e) fails.push(`${table}: ${errMsg(e)}`);
  }

  // Partner links reference this user as either the owner or the viewer.
  const { error: linkErr } = await adminClient
    .from('partner_links')
    .delete()
    .or(`owner_id.eq.${uid},viewer_id.eq.${uid}`);
  if (linkErr) fails.push(`partner_links: ${errMsg(linkErr)}`);

  const { error: profErr } = await adminClient.from('profiles').delete().eq('id', uid);
  if (profErr) fails.push(`profiles: ${errMsg(profErr)}`);

  const { error: userErr } = await adminClient.auth.admin.deleteUser(uid);
  if (userErr) fails.push(`auth: ${errMsg(userErr)}`);

  if (fails.length) return NextResponse.json({ error: fails.join('; ') }, { status: 500 });

  return NextResponse.json({ ok: true });
}
