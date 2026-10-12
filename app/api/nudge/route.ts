// Writes the merchant-facing message when a live event goes outside its envelope.
import { askJSON, errorNote, liveAIEnabled, MODELS } from "@/lib/claude";
import { demoNudge } from "@/lib/demo";
import { PERSONAS, PersonaId } from "@/lib/personas";
import { rateLimited } from "@/lib/rate-limit";
import type { Nudge } from "@/lib/types";

const SYSTEM = `You write short in-app messages to an Indian online merchant during a big sale, on behalf of their payment provider.
Tone: calm, specific, respectful of their time. Never say their account is frozen unless told so. Never reveal risk scores or internal thresholds beyond the envelope the merchant already agreed.
Return JSON: {"title": string (under 12 words), "message": string (under 60 words), "actions": [{"id": string, "label": string (under 6 words)}] (exactly 3 actions)}.`;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    personaId: PersonaId;
    scenario: "overshoot" | "card_testing";
    currentMultiple: number;
    envelopeMax: number;
  };
  const p = PERSONAS[body.personaId];
  if (!p) return Response.json({ error: "Unknown merchant" }, { status: 400 });
  const fallback = () => demoNudge(body);

  if (!liveAIEnabled() || rateLimited(req)) {
    return Response.json({ mode: "demo", note: "Demo mode", data: fallback() });
  }

  const situation =
    body.scenario === "card_testing"
      ? `A card-testing attack is hitting ${p.name}'s checkout: hundreds of tiny payments with stolen card numbers per hour. Razorpay's network fraud model (Vulcan) flagged the pattern across merchants; mention this in the message. The merchant is the victim. Their pre-cleared sale is unaffected and settlements keep flowing. Suggested protections: a checkout challenge for new cards and a limit on card attempts per device. Actions should be: turn on checkout challenge (id "challenge"), limit card attempts (id "ratelimit"), review later (id "dismiss").`
      : `${p.name} is running "${p.sale.name}". They pre-cleared up to ${body.envelopeMax}x their normal volume; they are now at ${body.currentMultiple.toFixed(1)}x. Nothing is frozen: settlements continue, but the risk team needs a bit more context. Actions should be: add more evidence (id "evidence"), accept a temporary 10% reserve (id "reserve"), pause ad campaigns (id "pause").`;

  try {
    const data = await askJSON<Nudge>({ model: MODELS.fast, system: SYSTEM, maxTokens: 2000, content: [{ type: "text", text: situation }] });
    return Response.json({ mode: "live", data });
  } catch (e) {
    return Response.json({ mode: "demo", note: errorNote(e), data: fallback() });
  }
}
