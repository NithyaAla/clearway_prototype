// Three demo merchants. All numbers here are simulated for the prototype.

export type PersonaId = "genz" | "glow" | "tickettrail";

export interface Metric {
  label: string;
  value: string;
  note: string;
  good: boolean; // whether this signal supports the merchant's case
}

export interface SampleInvoice {
  id: string;
  file: string; // under /samples
  label: string;
  flawed: boolean;
}

export interface Persona {
  id: PersonaId;
  name: string;
  legalName: string;
  gstin: string;
  vertical: "D2C brand" | "Seasonal store" | "Event ticketing";
  category: string;
  city: string;
  baselineDailyGmv: number; // INR
  aov: number; // INR
  unitLabel: string; // "orders" or "tickets"
  sale: {
    name: string;
    start: string; // ISO date
    end: string;
    dayMultipliers: number[]; // expected volume vs baseline, one per sale day
  };
  lastYear: { label: string; start: string; peakMultiple: number; days: number };
  signals: string[];
  defaultEnvelope: { maxMultiple: number; aovBandPct: number; reservePct: number; reserveDays: number };
  envelopeNote: string;
  metrics: Metric[];
  samples: SampleInvoice[];
}

export const PERSONAS: Record<PersonaId, Persona> = {
  genz: {
    id: "genz",
    name: "GenZ Couture",
    legalName: "GenZ Couture Pvt Ltd",
    gstin: "08AAKCG2468L1Z3",
    vertical: "D2C brand",
    category: "Clothing",
    city: "Jaipur",
    baselineDailyGmv: 340000,
    aov: 1850,
    unitLabel: "orders",
    sale: {
      name: "Festive Edit Sale",
      start: "2026-11-01",
      end: "2026-11-07",
      dayMultipliers: [3.4, 4.2, 5.0, 5.6, 5.1, 4.3, 3.5],
    },
    lastYear: { label: "Festive week 2025", start: "2025-11-01", peakMultiple: 4.6, days: 7 },
    signals: [
      "3 new discount codes in your Shopify store: FESTIVE25, EDIT30, NOVFREESHIP",
      "Meta ad spend up 4.1x week on week",
      "Last year's festive week peaked at 4.6x your normal volume",
    ],
    defaultEnvelope: { maxMultiple: 6.5, aovBandPct: 30, reservePct: 0, reserveDays: 0 },
    envelopeNote: "Established D2C seller with 3 years of history and clean dispute record.",
    metrics: [
      { label: "RTO rate (last 30 days)", value: "9.8%", note: "Below your 11.2% baseline", good: true },
      { label: "Repeat-shopper share", value: "34%", note: "Known-good buyers across the checkout network", good: true },
      { label: "Address quality", value: "92% high", note: "Deliverable, well-formed addresses", good: true },
      { label: "Unique pincodes (30 days)", value: "2,140", note: "Broad, organic demand", good: true },
      { label: "Delivered-shipment rate", value: "88%", note: "Via logistics connector", good: true },
      { label: "Chargeback rate (12 months)", value: "0.18%", note: "Well under network thresholds", good: true },
    ],
    samples: [
      { id: "genz-rangrez", file: "genz-rangrez-textiles.png", label: "Rangrez Textiles invoice", flawed: false },
      { id: "genz-neel", file: "genz-neel-weaves-flawed.png", label: "Neel Weaves invoice", flawed: true },
    ],
  },
  glow: {
    id: "glow",
    name: "Glow & Co. Gifting ",
    legalName: "Glow & Co. Gifting  LLP",
    gstin: "27AAJFG1122H1ZQ",
    vertical: "Seasonal store",
    category: "Festive gifting and hampers",
    city: "Pune",
    baselineDailyGmv: 62000,
    aov: 1250,
    unitLabel: "orders",
    sale: {
      name: "Diwali Gifting Fortnight",
      start: "2026-10-30",
      end: "2026-11-08",
      dayMultipliers: [3.0, 4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 8.5, 8.0, 6.0],
    },
    lastYear: { label: "Diwali 2025", start: "2025-10-11", peakMultiple: 7.2, days: 10 },
    signals: [
      "42 new products published in your Diwali hamper collection",
      "Instagram ad spend up 6x this week",
      "Last Diwali your volume peaked at 7.2x normal",
    ],
    defaultEnvelope: { maxMultiple: 10, aovBandPct: 30, reservePct: 0, reserveDays: 0 },
    envelopeNote: "Highly seasonal seller; spikes are expected and recur every year.",
    metrics: [
      { label: "RTO rate (last 30 days)", value: "7.5%", note: "Below your 8.1% baseline", good: true },
      { label: "Repeat-shopper share", value: "22%", note: "Corporate and repeat festive buyers", good: true },
      { label: "Address quality", value: "89% high", note: "Deliverable, well-formed addresses", good: true },
      { label: "Unique pincodes (30 days)", value: "960", note: "Spread across 140 cities", good: true },
      { label: "Delivered-shipment rate", value: "91%", note: "Via logistics connector", good: true },
      { label: "Chargeback rate (12 months)", value: "0.12%", note: "Well under network thresholds", good: true },
    ],
    samples: [
      { id: "glow-kesar", file: "glow-kesar-crafts.png", label: "Kesar Crafts invoice", flawed: false },
      { id: "glow-shubh", file: "glow-shubh-hampers-flawed.png", label: "Shubh Hampers invoice", flawed: true },
    ],
  },
  tickettrail: {
    id: "tickettrail",
    name: "TicketTrail Events",
    legalName: "TicketTrail Events Pvt Ltd",
    gstin: "29AAHCT8642R1Z9",
    vertical: "Event ticketing",
    category: "Music festival ticketing",
    city: "Bengaluru",
    baselineDailyGmv: 240000,
    aov: 3200,
    unitLabel: "tickets",
    sale: {
      name: "Indie Fest 2027 ticket launch",
      start: "2026-11-15",
      end: "2026-11-17",
      dayMultipliers: [20, 11, 6],
    },
    lastYear: { label: "Indie Fest 2026 launch", start: "2025-11-10", peakMultiple: 18, days: 3 },
    signals: [
      "New event listing: Indie Fest 2027 (14-15 Feb 2027), tickets open 15 Nov",
      "Early-bird page views up 9x in 48 hours",
      "Your last festival launch peaked at 18x normal volume",
    ],
    defaultEnvelope: { maxMultiple: 24, aovBandPct: 15, reservePct: 5, reserveDays: 30 },
    envelopeNote: "Ticketing: delivery is deferred to the event date, so chargeback exposure lasts until then. Narrower AOV band and a small rolling reserve apply.",
    metrics: [
      { label: "Past events delivered as scheduled", value: "6 of 6", note: "No cancellations in 3 years", good: true },
      { label: "Repeat-buyer share", value: "41%", note: "Returning festival-goers", good: true },
      { label: "Unique devices (last launch)", value: "11,900", note: "No concentration on few devices", good: true },
      { label: "Refund rate (12 months)", value: "1.9%", note: "Within category norms", good: true },
      { label: "Chargeback rate (12 months)", value: "0.31%", note: "Higher than retail; typical for ticketing", good: false },
      { label: "Prepaid share", value: "100%", note: "No cash-on-delivery exposure", good: true },
    ],
    samples: [
      { id: "tt-palace", file: "tickettrail-palace-grounds.png", label: "Palace Grounds venue invoice", flawed: false },
      { id: "tt-skyline", file: "tickettrail-skyline-arena-flawed.png", label: "Skyline Arena venue invoice", flawed: true },
    ],
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);

export function saleDays(p: Persona) {
  return p.sale.dayMultipliers.length;
}

export function baselineDailyUnits(p: Persona) {
  return p.baselineDailyGmv / p.aov;
}

export function expectedUnits(p: Persona, multiples = p.sale.dayMultipliers) {
  return Math.round(multiples.reduce((a, b) => a + b, 0) * baselineDailyUnits(p));
}

export function expectedSaleGmv(p: Persona) {
  return p.sale.dayMultipliers.reduce((a, b) => a + b, 0) * p.baselineDailyGmv;
}
