import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/webpush';
import type { PushSubscription } from 'web-push';

// Internal route — protected by CRON_SECRET, not user Bearer token.
// Call this from a Supabase Edge Function cron or a Vercel cron job.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const { userId, title, body, url } = await req.json();
  if (!userId || !title || !body) {
    return NextResponse.json({ error: 'Missing userId, title, or body' }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: subscriptions, error } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0 });

  const results = await Promise.allSettled(
    subscriptions.map((row) => {
      const sub: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      return sendPushNotification(sub, { title, body, url });
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, sent, failed });
}
