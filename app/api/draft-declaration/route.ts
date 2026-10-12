// Drafts the sale declaration from the merchant's history and campaign signals.
import { askJSON, errorNote, liveAIEnabled, MODELS } from "@/lib/claude";
import { demoDeclaration } from "@/lib/demo";
import { generateHistory, historyStats } from "@/lib/history";
import { PERSONAS, PersonaId } from "@/lib/personas";
import { rateLimited } from "@/lib/rate-limit";
import type { Declaration } from "@/lib/types";

const SYSTEM = `You are ClearWay, an agent that helps Indian online merchants pre-clear a planned sales spike with their payment provider's risk team, so their settlements are not held during the sale.
Draft the merchant's sale declaration from their history and campaign signals. Be realistic, not optimistic: a declaration that is too low triggers reviews; too high weakens trust.
Return JSON:
{
  "sale_name": string,
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "expected_multiple": number,   // average daily volume vs normal, one decimal
  "peak_multiple": number,       // highest single day vs normal, one decimal
  "aov_low": number,             // expected average order value range in INR, rounded to 50
  "aov_high": number,
  "channels": string[],
  "rationale": string,           // 2 short sentences citing the numbers given
  "questions_for_merchant": string[]  // 1-2 questions the merchant should answer before submitting
}`;

export async function POST(req: Request) {
  const { personaId } = (await req.json()) as { personaId: PersonaId };
  const p = PERSONAS[personaId];
  if (!p) return Response.json({ error: "Unknown merchant" }, { status: 400 });

  if (!liveAIEnabled() || rateLimited(req)) {
    return Response.json({ mode: "demo", note: "Demo mode: showing a saved draft.", data: demoDeclaration(p) });
  }

  const stats = historyStats(p, generateHistory(p));
  const context = {
    merchant: p.name,
    category: p.category,
    vertical: p.vertical,
    city: p.city,
    normal_daily_gmv_inr: p.baselineDailyGmv,
    normal_aov_inr: p.aov,
    months_on_platform: stats.monthsOnPlatform,
    last_12_months_gmv_inr: stats.gmvLast12Months,
    last_year_event: `${p.lastYear.label}, starting ${p.lastYear.start}, peaked at ${p.lastYear.peakMultiple}x normal volume over ${p.lastYear.days} days`,
    growth_since_last_year: "about 28%",
    detected_campaign_signals: p.signals,
    planned_sale_from_store: { name: p.sale.name, start: p.sale.start, end: p.sale.end },
  };

  try {
    const data = await askJSON<Declaration>({
      model: MODELS.smart,
      system: SYSTEM,
      maxTokens: 4000,
      content: [{ type: "text", text: `Merchant context:\n${JSON.stringify(context, null, 2)}` }],
    });
    return Response.json({ mode: "live", data });
  } catch (e) {
    return Response.json({ mode: "demo", note: errorNote(e), data: demoDeclaration(p) });
  }
}
