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
      periodEndDate: isoDate(c.periodEndDate),
    })),
    logs: data.logs.map((l) => ({ ...l, date: isoDate(l.date) ?? l.date })),
  };
}

export { sanitize };

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchFromSheet(): Promise<BloomData> {
  const userId = await getUserId();
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
        startDate: c.start_date,
        periodEndDate: c.period_end_date ?? undefined,
        cycleLength: c.cycle_length ?? undefined,
        periodLength: c.period_length ?? undefined,
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
    // Replace cycles (handles deletions)
    await supabase.from('cycles').delete().eq('user_id', userId);
    if (data.cycles.length > 0) {
      await supabase.from('cycles').insert(
        data.cycles.map((c) => ({
          cycle_id: c.id,
          user_id: userId,
          start_date: c.startDate,
          period_end_date: c.periodEndDate ?? null,
          cycle_length: c.cycleLength ?? null,
          period_length: c.periodLength ?? null,
        }))
      );
    }

    // Upsert logs (keyed by user+date, never deleted)
    if (data.logs.length > 0) {
      await supabase.from('daily_logs').upsert(
        data.logs.map((l) => ({
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
        })),
        { onConflict: 'log_id' }
      );
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
