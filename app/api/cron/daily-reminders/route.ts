import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/webpush';
import type { PushSubscription } from 'web-push';

// Vercel cron sends GET with Authorization: Bearer {CRON_SECRET}
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const results = { logReminder: { sent: 0, skipped: 0 }, periodSoon: { sent: 0, skipped: 0 } };

  // ── log_reminder ────────────────────────────────────────────────────────────
  const { data: logSubs } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .contains('notif_categories', ['log_reminder']);

  if (logSubs?.length) {
    // Single query: users who already logged today — skip them
    const { data: loggedToday } = await db
      .from('daily_logs')
      .select('user_id')
      .eq('date', today);

    const loggedIds = new Set(loggedToday?.map(l => l.user_id) ?? []);

    await Promise.allSettled(
      logSubs.map(async (sub) => {
        if (loggedIds.has(sub.user_id)) { results.logReminder.skipped++; return; }
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as PushSubscription,
          { title: 'How are you feeling today?', body: "Log your symptoms to keep your cycle insights accurate.", url: '/' }
        );
        results.logReminder.sent++;
      })
    );
  }

  // ── period_soon ─────────────────────────────────────────────────────────────
  const { data: periodSubs } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .contains('notif_categories', ['period_soon']);

  if (periodSubs?.length) {
    const userIds = [...new Set(periodSubs.map(s => s.user_id))];

    // Get each user's last 3 completed cycles to estimate avg cycle length
    const { data: allCycles } = await db
      .from('cycles')
      .select('user_id, start_date, cycle_length')
      .in('user_id', userIds)
      .not('cycle_length', 'is', null)
      .order('start_date', { ascending: false });

    // Group by user and compute prediction
    const cyclesByUser = new Map<string, { start_date: string; cycle_length: number }[]>();
    for (const c of allCycles ?? []) {
      const arr = cyclesByUser.get(c.user_id) ?? [];
      if (arr.length < 3) arr.push(c);
      cyclesByUser.set(c.user_id, arr);
    }

    // Get latest cycle start per user (may not have cycle_length yet — current cycle)
    const { data: latestCycles } = await db
      .from('cycles')
      .select('user_id, start_date')
      .in('user_id', userIds)
      .order('start_date', { ascending: false });

    const latestByUser = new Map<string, string>();
    for (const c of latestCycles ?? []) {
      if (!latestByUser.has(c.user_id)) latestByUser.set(c.user_id, c.start_date);
    }

    const todayMs = new Date(today).getTime();

    await Promise.allSettled(
      periodSubs.map(async (sub) => {
        const cycles = cyclesByUser.get(sub.user_id);
        const latestStart = latestByUser.get(sub.user_id);
        if (!cycles?.length || !latestStart) { results.periodSoon.skipped++; return; }

        const avgLength = Math.round(cycles.reduce((s, c) => s + c.cycle_length, 0) / cycles.length);
        const lastStartMs = new Date(latestStart).getTime();
        const daysSinceLast = Math.floor((todayMs - lastStartMs) / 86400000);

        // Don't alert if period just started (within last 3 days)
        if (daysSinceLast <= 3) { results.periodSoon.skipped++; return; }

        const daysUntil = avgLength - daysSinceLast;
        if (daysUntil < 1 || daysUntil > 3) { results.periodSoon.skipped++; return; }

        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as PushSubscription,
          {
            title: 'Period predicted soon',
            body: `Your period is expected in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Plan ahead.`,
            url: '/',
          }
        );
        results.periodSoon.sent++;
      })
    );
  }

  return NextResponse.json({ ok: true, today, results });
}
