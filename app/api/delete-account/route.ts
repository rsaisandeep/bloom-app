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

  await adminClient.from('profiles').delete().eq('id', user.id);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return NextResponse.json({ error: String(deleteError.message || deleteError) }, { status: 500 });

  return NextResponse.json({ ok: true });
}
