import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ALL_CATEGORIES = ['log_reminder', 'period_soon', 'cycle_update'];

async function authenticate(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { client, user };
}

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await auth.client
    .from('push_subscriptions')
    .select('notif_categories')
    .eq('user_id', auth.user.id)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ categories: data?.notif_categories ?? ALL_CATEGORIES });
}

export async function PATCH(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { categories } = await req.json();
  if (!Array.isArray(categories)) {
    return NextResponse.json({ error: 'categories must be an array' }, { status: 400 });
  }
  const valid = categories.filter((c: unknown) => typeof c === 'string' && ALL_CATEGORIES.includes(c));

  const { error } = await auth.client
    .from('push_subscriptions')
    .update({ notif_categories: valid })
    .eq('user_id', auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, categories: valid });
}
