// Hour-by-hour simulation of the sale, plus the "without ClearWay" counterfactual.
import { Persona } from "./personas";
import { rng, seedFor } from "./history";
import { addDays, shortDate } from "./format";

export type Scenario = "within" | "overshoot" | "card_testing";

export const SCENARIOS: { id: Scenario; label: string; blurb: string }[] = [
  { id: "within", label: "Sale goes to plan", blurb: "Volume stays inside the pre-cleared envelope." },
  { id: "overshoot", label: "Sale beats the plan", blurb: "Volume overshoots the envelope mid-sale." },
  { id: "card_testing", label: "Card-testing attack", blurb: "Fraudsters test stolen cards on the checkout." },
];

const HOURLY = [0.4, 0.25, 0.18, 0.15, 0.15, 0.2, 0.35, 0.6, 0.85, 1.0, 1.1, 1.25, 1.35, 1.3, 1.2, 1.15, 1.15, 1.25, 1.4, 1.6, 1.75, 1.6, 1.2, 0.75];
const HSUM = HOURLY.reduce((a, b) => a + b, 0);
const W = HOURLY.map((h) => h / HSUM);

// Illustrative assumption for the counterfactual: an unannounced spike above 2x normal
// triggers a review hold, and funds are released 72 hours after the sale ends.
export const UNDECLARED_HOLD_TRIGGER = 2;
export const REVIEW_HOURS = 72;
export const MDR = 0.02; // payment fees deducted at settlement
export const COST_OF_CAPITAL = 0.18; // annual, typical MSME working-capital rate

export interface HourPoint {
  i: number;
  day: number;
  hour: number;
  label: string; // e.g. "3 Nov 14:00"
  gmv: number;
  trailingMultiple: number;
  cardAttempts: number;
  envelope: number; // ceiling for trailing multiple
}

export function dayMultipliersFor(p: Persona, scenario: Scenario) {
  const m = [...p.sale.dayMultipliers];
  if (scenario !== "overshoot") return m;
  const peak = m.indexOf(Math.max(...m));
  return m.map((v, d) => (Math.abs(d - peak) <= 1 ? +(v * 1.6).toFixed(2) : v));
}

export function simulate(p: Persona, scenario: Scenario, envelopeMax: number): HourPoint[] {
  const rand = rng(seedFor(p.id, scenario.length));
  const mult = dayMultipliersFor(p, scenario);
  const hourBase = p.baselineDailyGmv;
  const window: number[] = W.map((w) => hourBase * w); // previous 24h at normal volume
  const attackDay = Math.floor(mult.length / 2);
  const attack: Record<number, number> = { 2: 180, 3: 420, 4: 510, 5: 260 };
  const out: HourPoint[] = [];
  mult.forEach((m, day) => {
    for (let hour = 0; hour < 24; hour++) {
      const noise = 0.88 + rand() * 0.24;
      const gmv = hourBase * W[hour] * m * noise;
      window.push(gmv);
      window.shift();
      const trailing = window.reduce((a, b) => a + b, 0) / p.baselineDailyGmv;
      out.push({
        i: out.length,
        day,
        hour,
        label: `${shortDate(addDays(p.sale.start, day))} ${String(hour).padStart(2, "0")}:00`,
        gmv: Math.round(gmv),
        trailingMultiple: +trailing.toFixed(2),
        cardAttempts: scenario === "card_testing" && day === attackDay ? attack[hour] ?? 0 : 0,
        envelope: envelopeMax,
      });
    }
  });
  return out;
}

export interface Counterfactual {
  triggerIndex: number | null;
  heldGmv: number;
  heldGmvDays: number;
  avgHeldDays: number;
}

export function counterfactual(points: HourPoint[]): Counterfactual {
  const trigger = points.findIndex((pt) => pt.trailingMultiple > UNDECLARED_HOLD_TRIGGER);
  if (trigger < 0) return { triggerIndex: null, heldGmv: 0, heldGmvDays: 0, avgHeldDays: 0 };
  const release = points.length + REVIEW_HOURS;
  let held = 0, gmvDays = 0;
  for (let i = trigger; i < points.length; i++) {
    held += points[i].gmv;
    gmvDays += (points[i].gmv * (release - i)) / 24;
  }
  return { triggerIndex: trigger, heldGmv: held, heldGmvDays: gmvDays, avgHeldDays: gmvDays / held };
}

export function totalGmv(points: HourPoint[]) {
  return points.reduce((a, b) => a + b.gmv, 0);
}

export function workingCapitalValue(gmvDays: number) {
  return (gmvDays * COST_OF_CAPITAL) / 365;
}
