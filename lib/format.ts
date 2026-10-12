// Indian number formatting helpers.

export function inr(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1e7) return `₹${(n / 1e7).toFixed(abs >= 1e8 ? 0 : 2)} Cr`;
    if (abs >= 1e5) return `₹${(n / 1e5).toFixed(abs >= 1e6 ? 1 : 2)} L`;
    if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  }
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function num(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  void y;
  return `${d} ${MONTHS[m - 1]}`;
}

export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function addDays(iso: string, days: number) {
  const t = Date.parse(iso + "T00:00:00Z") + days * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
}
