// Writes the summary a Razorpay risk analyst reads before approving the envelope.
import { askJSON, errorNote, liveAIEnabled, MODELS } from "@/lib/claude";
import { demoReviewerSummary } from "@/lib/demo";
import { generateHistory, historyStats } from "@/lib/history";
import { PERSONAS, PersonaId, expectedUnits } from "@/lib/personas";
import { rateLimited } from "@/lib/rate-limit";
import type { Check, Declaration, ReviewerSummary } from "@/lib/types";

const SYSTEM = `You assist a risk analyst at an Indian payment aggregator. A merchant has declared an upcoming sales spike and submitted evidence so their settlements are not held during the sale.
You never make the final decision; a human maker and checker do. Your job is a crisp, specific brief.
Rules: cite the numbers you are given; name gaps plainly; do not invent facts; failed checks mean "Needs more evidence"; keep every list item under 25 words.
Return JSON:
{
  "headline": string,            // one line, under 15 words
  "summary": string,             // 3 sentences max
  "strengths": string[],         // 2-4 items
  "concerns": string[],          // 0-4 items
  "recommendation": "Pre-clear" | "Pre-clear with conditions" | "Needs more evidence",
  "recommended_envelope": {
    "max_multiple": number,      // volume ceiling vs normal before a clarification is raised
    "aov_band_pct": number,      // allowed +/- % around normal AOV
    "reserve_pct": number,       // rolling reserve, 0 if none
    "reserve_days": number
  }
}`;

export async function POST(req: Request) {
  const body = (await req.json()) as { personaId: PersonaId; declaration: Declaration; checks: Check[]; sharedItems: string[] };
  const p = PERSONAS[body.personaId];
  if (!p) return Response.json({ error: "Unknown merchant" }, { status: 400 });

  const fallback = () => demoReviewerSummary({ personaId: body.personaId, checks: body.checks, declaration: body.declaration });
  if (!liveAIEnabled() || rateLimited(req)) {
    return Response.json({ mode: "demo", note: "Demo mode: showing a templated summary.", data: fallback() });
  }

  const stats = historyStats(p, generateHistory(p));
  const context = {
    merchant: { name: p.legalName, vertical: p.vertical, category: p.category, months_on_platform: stats.monthsOnPlatform, normal_daily_gmv_inr: p.baselineDailyGmv, normal_aov_inr: p.aov },
    history: { last_year: `${p.lastYear.label} peaked at ${p.lastYear.peakMultiple}x`, gmv_last_12_months_inr: stats.gmvLast12Months },
    declaration: body.declaration,
    expected_units_in_sale: expectedUnits(p),
    evidence_checks: body.checks,
    order_quality_signals: p.metrics.map((m) => `${m.label}: ${m.value} (${m.note})`),
    items_merchant_chose_to_share: body.sharedItems,
    category_guidance: p.envelopeNote,
  };

  try {
    const data = await askJSON<ReviewerSummary>({
      model: MODELS.smart,
      system: SYSTEM,
      maxTokens: 1000,
      content: [{ type: "text", text: `Case file:\n${JSON.stringify(context, null, 2)}` }],
    });
    return Response.json({ mode: "live", data });
  } catch (e) {
    return Response.json({ mode: "demo", note: errorNote(e), data: fallback() });
  }
}
