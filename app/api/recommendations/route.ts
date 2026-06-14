import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/matcher";
import menstrual from "@/data/phases/menstrual.json";
import follicular from "@/data/phases/follicular.json";
import ovulation from "@/data/phases/ovulation.json";
import luteal from "@/data/phases/luteal.json";

const phases = { menstrual, follicular, ovulation, luteal } as Record<string, any>;

export async function POST(req: NextRequest) {
  const { phase, log } = await req.json();
  const phaseData = phases[phase];
  if (!phaseData) return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
  const recs = getRecommendations(phaseData, log ?? {});
  return NextResponse.json(recs);
}
