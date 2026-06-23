import type { BloomData } from './cycle';
import { loadData, saveData, emptyData } from './cycle';
import { supabase } from './supabase';

function isoDate(s: string | undefined): string | undefined {
  if (!s) return undefined;
  return s.length > 10 && s.includes('T') ? s.slice(0, 10) : s;
}

function sanitize(data: BloomData): BloomData {
  return {
    ...data,
    cycles: data.cycles.map((c) => ({
      ...c,
      startDate: isoDate(c.startDate) ?? c.startDate,
      periodEndDate: isoDate(c.periodEndDate), // date only
      periodEndAt: c.periodEndAt,              // keep full timestamp (date + time)
    })),
    logs: data.logs.map((l) => ({ ...l, date: isoDate(l.date) ?? l.date })),
  };
}

export { sanitize };

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// `targetUserId` lets a viewer load a partner's data instead of their own —
// RLS only returns rows the viewer is an accepted partner for (read-only).
export async function fetchFromSheet(targetUserId?: string): Promise<BloomData> {
  const userId = targetUserId ?? await getUserId();
  if (!userId) return loadData();

  try {
    const [{ data: cycles }, { data: logs }, { data: settingsRow }] = await Promise.all([
      supabase.from('cycles').select('*').eq('user_id', userId),
      supabase.from('daily_logs').select('*').eq('user_id', userId),
      supabase.from('settings').select('data').eq('user_id', userId).maybeSingle(),
    ]);

    const bloomData: BloomData = {
      cycles: (cycles ?? []).map((c) => ({
        id: c.cycle_id,
        name: c.name ?? undefined,
        startDate: c.start_date,
        periodEndDate: c.period_end_date ?? undefined,
        periodEndAt: c.period_end_at ?? undefined,
        cycleLength: c.cycle_length ?? undefined,
        periodLength: c.period_length ?? undefined,
        period_end_source: (c.period_end_source as 'manual' | 'computer' | null) ?? undefined,
      })),
      logs: (logs ?? []).map((l) => ({
        date: l.date,
        flow: l.flow ?? undefined,
        cramps: l.cramps,
        energy: l.energy,
        mood: l.mood,
        bloating: l.bloating,
        sleep: l.sleep,
        cravings: l.cravings,
        notes: l.notes ?? undefined,
        symptoms: l.symptoms ?? undefined,
        cervicalMucus: l.cervical_mucus ?? undefined,
        bbt: l.bbt ?? undefined,
        sex: l.sex ?? undefined,
        ovulationTest: l.ovulation_test ?? undefined,
        pregnancyTest: l.pregnancy_test ?? undefined,
        pill: l.pill ?? undefined,
        water: l.water ?? undefined,
        weight: l.weight ?? undefined,
      })),
      // Preserve local settings if Supabase has none yet (race between save and fetch)
      settings: settingsRow?.data ?? loadData().settings ?? {},
    };

    const sanitized = sanitize(bloomData);
    saveData(sanitized);
    return sanitized;
  } catch {
    return loadData();
  }
}

export async function saveToSheet(data: BloomData): Promise<boolean> {
  saveData(data); // cache first for instant UI
  const userId = await getUserId();
  if (!userId) return true;

  try {
    // Upsert cycles first (no data-loss window if the network drops mid-save),
    // then delete any rows that were removed locally.
    const cycleRows = data.cycles.map((c) => ({
      cycle_id: c.id,
      user_id: userId,
      name: c.name ?? null,
      start_date: c.startDate,
      period_end_date: c.periodEndDate ?? null,
      period_end_at: c.periodEndAt ?? null,
      cycle_length: c.cycleLength ?? null,
      period_length: c.periodLength ?? null,
      period_end_source: c.period_end_source ?? null,
    }));
    if (cycleRows.length > 0) {
      const { error } = await supabase.from('cycles').upsert(cycleRows, { onConflict: 'cycle_id' });
      // If optional columns aren't migrated yet, retry without them.
      if (error) {
        const stripped = cycleRows.map((r) => {
          const c: Record<string, unknown> = { ...r };
          delete c.period_end_at;
          delete c.name;
          delete c.period_end_source;
          return c;
        });
        await supabase.from('cycles').upsert(stripped, { onConflict: 'cycle_id' });
      }
    }
    // Prune cycles deleted locally.
    const keepIds = cycleRows.map((r) => r.cycle_id);
    if (keepIds.length > 0) {
      await supabase.from('cycles').delete().eq('user_id', userId).not('cycle_id', 'in', `(${keepIds.join(',')})`);
    } else {
      await supabase.from('cycles').delete().eq('user_id', userId);
    }

    // Upsert logs (keyed by user+date, never deleted)
    if (data.logs.length > 0) {
      const rows = data.logs.map((l) => ({
        log_id: `${userId}_${l.date}`,
        user_id: userId,
        date: l.date,
        flow: l.flow ?? null,
        cramps: l.cramps ?? null,
        energy: l.energy ?? null,
        mood: l.mood ?? null,
        bloating: l.bloating ?? null,
        sleep: l.sleep ?? null,
        cravings: l.cravings ?? null,
        notes: l.notes ?? null,
        symptoms: l.symptoms ?? null,
        cervical_mucus: l.cervicalMucus ?? null,
        bbt: l.bbt ?? null,
        sex: l.sex ?? null,
        ovulation_test: l.ovulationTest ?? null,
        pregnancy_test: l.pregnancyTest ?? null,
        pill: l.pill ?? null,
        water: l.water ?? null,
        weight: l.weight ?? null,
      }));
      const { error } = await supabase.from('daily_logs').upsert(rows, { onConflict: 'log_id' });
      // If the Tier 2/3 columns aren't migrated yet, retry without them so core
      // logging never breaks. (Run the migration to persist the new fields.)
      if (error) {
        const extra = ['ovulation_test', 'pregnancy_test', 'pill', 'water', 'weight'];
        const stripped = rows.map((r) => {
          const c: Record<string, unknown> = { ...r };
          for (const k of extra) delete c[k];
          return c;
        });
        await supabase.from('daily_logs').upsert(stripped, { onConflict: 'log_id' });
      }
    }

    // Upsert settings blob
    await supabase.from('settings').upsert(
      { user_id: userId, data: data.settings },
      { onConflict: 'user_id' }
    );

    return true;
  } catch {
    return false;
  }
}

export { emptyData };
