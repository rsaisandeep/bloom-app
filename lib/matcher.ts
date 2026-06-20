import type { Phase, DayLog } from "./cycle";
import { isInputValidForPhase } from "./cycle";

interface RecommendationVersions {
  versions: string[];
  science: string;
}

interface RuleRecommendations {
  food: RecommendationVersions;
  exercise: RecommendationVersions;
  selfcare: RecommendationVersions;
}

interface Rule {
  id: string;
  priority: number;
  conditions: Partial<Record<keyof DayLog, string[]>>;
  recommendations: RuleRecommendations;
}

interface PhaseData {
  phase: Phase;
  description: string;
  hormone_profile: string;
  default: RuleRecommendations;
  rules: Rule[];
}

export interface Recommendations {
  phase: Phase;
  phaseDescription: string;
  hormoneProfile: string;
  food: { text: string; science: string };
  exercise: { text: string; science: string };
  selfcare: { text: string; science: string };
  matchedRule: string;
}

export function getRecommendations(phaseData: PhaseData, userInput: Partial<DayLog>): Recommendations {
  const matchedRule = findBestRule(phaseData.rules, userInput, phaseData.phase);
  const source = matchedRule ? matchedRule.recommendations : phaseData.default;

  return {
    phase: phaseData.phase,
    phaseDescription: phaseData.description,
    hormoneProfile: phaseData.hormone_profile,
    food: { text: pickRandom(source.food.versions), science: source.food.science },
    exercise: { text: pickRandom(source.exercise.versions), science: source.exercise.science },
    selfcare: { text: pickRandom(source.selfcare.versions), science: source.selfcare.science },
    matchedRule: matchedRule?.id ?? "default",
  };
}

function findBestRule(rules: Rule[], userInput: Partial<DayLog>, phase: Phase): Rule | null {
  if (!rules || rules.length === 0) return null;
  let bestRule: Rule | null = null;
  let bestScore = -1;

  for (const rule of rules) {
    const score = scoreRule(rule, userInput, phase);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }
  return bestScore > 0 ? bestRule : null;
}

function scoreRule(rule: Rule, userInput: Partial<DayLog>, phase: Phase): number {
  const conditions = rule.conditions;
  let matchCount = 0;

  for (const [key, acceptedValues] of Object.entries(conditions)) {
    // Ignore any condition keyed on an input that is irrelevant to this phase,
    // so a misplaced rule can never match on an out-of-phase field.
    if (!isInputValidForPhase(phase, key as keyof DayLog)) continue;
    const val = userInput[key as keyof DayLog];
    const accepted = acceptedValues as string[];
    if (val === undefined || val === null) continue;
    // Array fields (e.g. symptoms) match on any overlap; scalars on equality.
    const hit = Array.isArray(val)
      ? val.some((v) => accepted.includes(v))
      : accepted.includes(val as string);
    if (hit) matchCount++;
    else return -1;
  }
  return matchCount > 0 ? rule.priority * matchCount : 0;
}

function pickRandom(versions: string[]): string {
  return versions[Math.floor(Math.random() * versions.length)];
}
