// Sample/demo data for the "always-on" Reports preview. Shown (clearly labeled)
// when the user hasn't logged enough yet, so every chart is visible from day one.
// Never persisted — built fresh in memory and fed through the real computeInsights
// pipeline so the preview matches exactly what real data will look like.
import type { BloomData, DayLog } from "./cycle";
import type { Recommendations } from "./matcher";

const MS_DAY = 86400000;
function iso(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function shift(days: number): string {
  return iso(new Date(Date.now() - days * MS_DAY));
}

// 6 cycles ending in one in-progress cycle — realistic lengths (slightly irregular).
const CYCLE_STARTS = [148, 119, 92, 62, 31, 3]; // days ago, oldest → newest
const LENGTHS = [29, 27, 30, 31, 28]; // gaps between consecutive starts (last is in progress)

const MOODS: DayLog["mood"][] = ["happy", "calm", "anxious", "irritable", "sad", "energetic", "fatigued"];
const SYMS = ["headache", "acne", "backache", "tender_breasts", "nausea", "fatigue", "bloating"];

export function buildSampleData(): BloomData {
  const cycles = CYCLE_STARTS.map((ago, i) => ({
    id: `sample_${shift(ago)}`,
    startDate: shift(ago),
    cycleLength: i < LENGTHS.length ? LENGTHS[i] : undefined,
    periodLength: 5,
    periodEndDate: i < LENGTHS.length ? shift(ago - 4) : undefined,
  }));

  // ~34 daily logs across the two most recent cycles so every phase has data.
  const logs: DayLog[] = [];
  for (let ago = 34; ago >= 0; ago--) {
    const date = shift(ago);
    // day-of-cycle within the current cycle (started 3 days ago) or previous one
    const dayInCurrent = 3 - ago; // negative before current cycle
    const isMenstrual = (dayInCurrent >= 1 && dayInCurrent <= 5) || (ago >= 28 && ago <= 32);
    const flow: DayLog["flow"] = isMenstrual ? (ago % 5 < 2 ? "heavy" : "light") : "none";
    const energy: DayLog["energy"] = isMenstrual ? "low" : ago % 7 < 2 ? "high" : "medium";
    const seed = (ago * 7) % MOODS.length;
    logs.push({
      date,
      flow,
      cramps: isMenstrual ? (ago % 3 === 0 ? "moderate" : "mild") : "none",
      energy,
      mood: isMenstrual ? "fatigued" : MOODS[seed],
      bloating: isMenstrual || ago % 6 === 0 ? "mild" : "none",
      sleep: ago % 5 === 0 ? "poor" : "good",
      cravings: dayInCurrent < 0 && dayInCurrent > -7 ? "sweet" : "none",
      symptoms: ago % 4 === 0 ? [SYMS[ago % SYMS.length]] : undefined,
      bbt: 36.3 + (dayInCurrent > 14 || ago < 14 ? 0.35 : 0) + ((ago % 3) * 0.03),
      weight: 60 + ((ago % 8) - 4) * 0.15,
    });
  }

  return { cycles, logs, settings: {} };
}

export const SAMPLE_RECS: Recommendations = {
  phase: "follicular",
  phaseDescription: "Energy is rising as estrogen climbs. A great window to start new projects and train harder.",
  hormoneProfile: "Rising estrogen",
  food: {
    text: "Lean into fresh, light meals — leafy greens, eggs, and fermented foods support rising estrogen.",
    science: "Estrogen metabolism relies on B-vitamins and gut health; cruciferous and fermented foods aid clearance.",
  },
  exercise: {
    text: "Your body recovers fast now — a good time for strength training or a higher-intensity class.",
    science: "Higher estrogen improves muscle protein synthesis and pain tolerance, supporting harder efforts.",
  },
  selfcare: {
    text: "Channel the social, outgoing energy — schedule the things you've been putting off.",
    science: "Rising estrogen lifts mood and verbal fluency, making this the easiest phase for connection.",
  },
  matchedRule: "sample",
};
