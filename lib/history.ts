// Deterministic synthetic sales history for each persona.
import { Persona } from "./personas";
import { addDays, daysBetween } from "./format";

export const DEMO_TODAY = "2026-10-12";
const HISTORY_START = "2025-09-01";

export function rng(seed: number) {
  // mulberry32
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(id: string, salt = 0) {
  let h = 2166136261 + salt;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export interface DayPoint {
  date: string;
  gmv: number;
  multiple: number; // vs that period's baseline
}

export function generateHistory(p: Persona): DayPoint[] {
  const rand = rng(seedFor(p.id));
  const total = daysBetween(HISTORY_START, DEMO_TODAY);
  const lyCurve = p.sale.dayMultipliers.map((m) => (m / Math.max(...p.sale.dayMultipliers)) * p.lastYear.peakMultiple);
  const lyStart = p.lastYear.start;
  const out: DayPoint[] = [];
  for (let i = 0; i < total; i++) {
    const date = addDays(HISTORY_START, i);
    const growth = 0.78 + 0.22 * (i / total); // grew ~28% over the year
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    const weekly = dow === 0 || dow === 6 ? 1.12 : 0.95;
    const noise = 0.9 + rand() * 0.2;
    const base = p.baselineDailyGmv * growth;
    const k = daysBetween(lyStart, date);
    const festive = k >= 0 && k < lyCurve.length ? lyCurve[k] : 1;
    // gentle build-up the week before last year's spike
    const ramp = k < 0 && k >= -6 ? 1 + (7 + k) * 0.12 : 1;
    const gmv = base * weekly * noise * festive * ramp;
    out.push({ date, gmv: Math.round(gmv), multiple: +(gmv / base).toFixed(2) });
  }
  return out;
}

export function historyStats(p: Persona, h: DayPoint[]) {
  const last90 = h.slice(-90);
  const avg90 = last90.reduce((a, d) => a + d.gmv, 0) / last90.length;
  const last365 = h.slice(-365).reduce((a, d) => a + d.gmv, 0);
  const peak = h.reduce((best, d) => (d.multiple > best.multiple ? d : best), h[0]);
  return {
    avgDailyLast90: Math.round(avg90),
    gmvLast12Months: Math.round(last365),
    lastYearPeakMultiple: p.lastYear.peakMultiple,
    lastYearPeakDate: peak.date,
    monthsOnPlatform: p.id === "glow" ? 26 : p.id === "genz" ? 38 : 31,
  };
}
