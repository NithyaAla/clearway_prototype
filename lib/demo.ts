// Saved AI outputs used in demo mode, or when a live call fails.
// They mirror what the live model returns, so the demo never breaks.
import { Persona, PERSONAS, expectedUnits } from "./personas";
import type { Check, Declaration, InvoiceExtraction, Nudge, ReviewerSummary } from "./types";
import { inr } from "./format";

const li = (description: string, quantity: number, unit_price: number) => ({
  description,
  quantity,
  unit_price,
  amount: quantity * unit_price,
});

function inv(p: Omit<InvoiceExtraction, "confidence" | "notes" | "taxable_value" | "total_amount">, gstRate: number): InvoiceExtraction {
  const taxable = p.line_items.reduce((a, l) => a + (l.amount ?? 0), 0);
  const gst = Math.round(taxable * gstRate * 100) / 100;
  return { ...p, taxable_value: taxable, gst_amount: gst, total_amount: taxable + gst, confidence: "high", notes: null };
}

export const DEMO_EXTRACTIONS: Record<string, InvoiceExtraction> = {
  "genz-rangrez": inv(
    {
      supplier_name: "Rangrez Textiles Pvt Ltd",
      supplier_gstin: "08AAFCR5678M1ZL",
      buyer_name: "GenZ Couture Pvt Ltd",
      buyer_gstin: "08AAKCG2468L1Z3",
      invoice_number: "RT/2026-27/0417",
      invoice_date: "2026-10-02",
      line_items: [li("Cotton kurta sets (S-XXL)", 3000, 620), li("Printed dupattas", 2500, 210), li("Anarkali dresses", 1700, 890)],
      capacity_or_units: 7200,
      gst_amount: null,
    },
    0.05,
  ),
  "genz-neel": inv(
    {
      supplier_name: "Neel Weaves Pvt Ltd",
      supplier_gstin: "24AAGCN4321Q1Z8",
      buyer_name: "GenZ Couture Pvt Ltd",
      buyer_gstin: "08AAKCG2468L1Z3",
      invoice_number: "NW/0988",
      invoice_date: "2026-09-28",
      line_items: [li("Silk blend sarees", 2000, 1150), li("Kurta fabric bundles", 3000, 340)],
      capacity_or_units: 5000,
      gst_amount: null,
    },
    0.05,
  ),
  "glow-kesar": inv(
    {
      supplier_name: "Kesar Crafts & Packaging LLP",
      supplier_gstin: "27AACFK1357N1Z3",
      buyer_name: "Glow & Co. Gifting  LLP",
      buyer_gstin: "27AAJFG1122H1ZQ",
      invoice_number: "KC-26-1132",
      invoice_date: "2026-09-25",
      line_items: [li("Diwali hamper boxes (assorted)", 2500, 540), li("Brass diya sets", 1200, 380), li("Scented candle gift packs", 800, 260)],
      capacity_or_units: 4500,
      gst_amount: null,
    },
    0.18,
  ),
  "glow-shubh": inv(
    {
      supplier_name: "Shubh Hampers Pvt Ltd",
      supplier_gstin: "27AABCS9758P1ZI",
      buyer_name: "Glow & Co. Gifting  LLP",
      buyer_gstin: "27AAJFG1122H1ZQ",
      invoice_number: "SH/26/377",
      invoice_date: "2026-09-30",
      line_items: [li("Premium dry fruit hampers", 2200, 690), li("Festive gift boxes", 2000, 310)],
      capacity_or_units: 4200,
      gst_amount: null,
    },
    0.18,
  ),
  "tt-palace": inv(
    {
      supplier_name: "Palace Grounds Venue Management Pvt Ltd",
      supplier_gstin: "29AADCP7531K1Z1",
      buyer_name: "TicketTrail Events Pvt Ltd",
      buyer_gstin: "29AAHCT8642R1Z9",
      invoice_number: "PGV/EVT/2026/212",
      invoice_date: "2026-10-05",
      line_items: [li("Venue hire, Indie Fest 2027, 14-15 Feb 2027 (capacity 12,000)", 1, 2800000), li("Stage, sound and lighting package", 1, 950000)],
      capacity_or_units: 12000,
      gst_amount: null,
    },
    0.18,
  ),
  "tt-skyline": inv(
    {
      supplier_name: "Skyline Arena LLP",
      supplier_gstin: "29AAEFS8642T1Z3",
      buyer_name: "TicketTrail Events Pvt Ltd",
      buyer_gstin: "29AAHCT8642R1Z9",
      invoice_number: "SA/0091",
      invoice_date: "2026-10-03",
      line_items: [li("Venue hire, Indie Fest 2027, 14-15 Feb 2027 (capacity 1,800)", 1, 1100000)],
      capacity_or_units: 1800,
      gst_amount: null,
    },
    0.18,
  ),
};

export function demoExtraction(sampleId?: string): InvoiceExtraction {
  if (sampleId && DEMO_EXTRACTIONS[sampleId]) return DEMO_EXTRACTIONS[sampleId];
  return {
    supplier_name: null,
    supplier_gstin: null,
    buyer_name: null,
    buyer_gstin: null,
    invoice_number: null,
    invoice_date: null,
    line_items: [],
    capacity_or_units: null,
    taxable_value: null,
    gst_amount: null,
    total_amount: null,
    confidence: "low",
    notes: "Demo mode can only replay the sample invoices. Add an API key to read your own uploads.",
  };
}

export function demoDeclaration(p: Persona): Declaration {
  const m = p.sale.dayMultipliers;
  const avg = m.reduce((a, b) => a + b, 0) / m.length;
  const band = p.defaultEnvelope.aovBandPct / 100;
  return {
    sale_name: p.sale.name,
    start_date: p.sale.start,
    end_date: p.sale.end,
    expected_multiple: Math.round(avg * 10) / 10,
    peak_multiple: Math.max(...m),
    aov_low: Math.round((p.aov * (1 - band)) / 50) * 50,
    aov_high: Math.round((p.aov * (1 + band)) / 50) * 50,
    channels:
      p.vertical === "Event ticketing"
        ? ["Event website checkout", "Instagram and partner links"]
        : ["Shopify storefront", "Instagram shop", "WhatsApp payment links"],
    rationale: `${p.lastYear.label} peaked at ${p.lastYear.peakMultiple}x your normal volume, and this year's signals (ads, new listings) point slightly higher. Your business has grown about 28% since then, so we suggest planning for an average of ${avg.toFixed(1)}x with a peak near ${Math.max(...m)}x.`,
    questions_for_merchant: [
      "Are you running any marketplace or offline channels that also settle through this account?",
      p.vertical === "Event ticketing" ? "Is the venue booking confirmed, and what is the refund policy if the event is postponed?" : "Do you have supplier invoices covering the stock for this sale?",
    ],
  };
}

export function demoReviewerSummary(args: { personaId: string; checks: Check[]; declaration: Declaration }): ReviewerSummary {
  const p = PERSONAS[args.personaId as keyof typeof PERSONAS];
  const fails = args.checks.filter((c) => c.status === "fail");
  const warns = args.checks.filter((c) => c.status === "warn");
  const env = p.defaultEnvelope;
  const recommendation = fails.length ? "Needs more evidence" : warns.length || env.reservePct ? "Pre-clear with conditions" : "Pre-clear";
  const decl = args.declaration;
  const strengths = [
    `${p.lastYear.label} reached ${p.lastYear.peakMultiple}x with no dispute spike, so a ${decl.peak_multiple}x peak is consistent with history.`,
    ...p.metrics.filter((m) => m.good).slice(0, 3).map((m) => `${m.label}: ${m.value} (${m.note.toLowerCase()}).`),
  ];
  const concerns = [
    ...fails.map((c) => `${c.label}: ${c.detail}`),
    ...warns.map((c) => `${c.label}: ${c.detail}`),
    ...p.metrics.filter((m) => !m.good).map((m) => `${m.label} is ${m.value}; ${m.note.toLowerCase()}.`),
  ];
  if (p.vertical === "Event ticketing") concerns.push("Delivery is deferred to Feb 2027, so chargeback exposure stays open until the event.");
  return {
    headline:
      recommendation === "Pre-clear"
        ? `${p.name}: declared ${decl.sale_name} is consistent with history and evidence`
        : recommendation === "Needs more evidence"
          ? `${p.name}: evidence has gaps that need fixing before pre-clearance`
          : `${p.name}: pre-clear with a tighter envelope`,
    summary: `${p.name} declares ${decl.sale_name} from ${decl.start_date} to ${decl.end_date}, expecting ${decl.expected_multiple}x average and ${decl.peak_multiple}x peak volume (about ${inr(decl.expected_multiple * p.baselineDailyGmv, { compact: true })} a day). Expected volume is roughly ${expectedUnits(p).toLocaleString("en-IN")} ${p.unitLabel}. ${fails.length ? `${fails.length} evidence check${fails.length > 1 ? "s" : ""} failed, so the merchant should resubmit before a decision.` : "Supplier evidence passed automated checks; a reviewer should confirm the envelope."}`,
    strengths,
    concerns: concerns.length ? concerns : ["No material concerns in the submitted evidence."],
    recommendation,
    recommended_envelope: {
      max_multiple: fails.length ? Math.max(3, Math.round(decl.peak_multiple * 0.8)) : env.maxMultiple,
      aov_band_pct: env.aovBandPct,
      reserve_pct: fails.length ? Math.max(env.reservePct, 10) : env.reservePct,
      reserve_days: fails.length ? Math.max(env.reserveDays, 30) : env.reserveDays,
    },
  };
}

export function demoNudge(args: { scenario: string; personaId: string; currentMultiple: number; envelopeMax: number }): Nudge {
  const p = PERSONAS[args.personaId as keyof typeof PERSONAS];
  if (args.scenario === "card_testing") {
    return {
      title: "We blocked a card-testing attack on your checkout",
      message: `Razorpay's network fraud model (Vulcan) spotted hundreds of stolen card numbers being tried. We've marked your account as the victim, not the cause, so your settlements keep flowing. Turning on the checkout challenge stops the attempts within minutes.`,
      actions: [
        { id: "challenge", label: "Turn on checkout challenge" },
        { id: "ratelimit", label: "Limit card attempts per device" },
        { id: "dismiss", label: "I'll review later" },
      ],
    };
  }
  return {
    title: `Sales are running at ${args.currentMultiple.toFixed(1)}x, above your ${args.envelopeMax}x plan`,
    message: `Great news for ${p.name}, and nothing is frozen: settlements are still flowing. Razorpay's risk team just needs a little more context. Adding a recent supplier invoice or confirming your stock usually clears this in under an hour.`,
    actions: [
      { id: "evidence", label: "Add more evidence" },
      { id: "reserve", label: "Accept a temporary 10% reserve" },
      { id: "pause", label: "Pause ad campaigns" },
    ],
  };
}
