// Deterministic checks run on the AI-extracted invoice fields.
// The AI reads the document; plain code verifies it. This split is
// deliberate: rules are auditable, the LLM only does the reading.
import { Persona, expectedUnits } from "./personas";
import { DEMO_TODAY } from "./history";
import { daysBetween, num } from "./format";
import type { InvoiceExtraction, Check } from "./types";

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function gstinCheckChar(first14: string) {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    total += Math.floor(v / 36) + (v % 36);
  }
  return CHARS[(36 - (total % 36)) % 36];
}

export function validateGstin(g: string | null | undefined) {
  if (!g) return { format: false, checksum: false };
  const s = g.replace(/\s/g, "").toUpperCase();
  const format = GSTIN_RE.test(s);
  const checksum = format && gstinCheckChar(s.slice(0, 14)) === s[14];
  return { format, checksum };
}

// Mock GST registry. In production this would be a GSTN lookup API.
export const MOCK_REGISTRY: Record<string, { name: string; status: "Active" | "Cancelled"; since?: string }> = {
  "08AAFCR5678M1ZL": { name: "Rangrez Textiles Pvt Ltd", status: "Active" },
  "24AAGCN4321Q1Z8": { name: "Neel Weaves Pvt Ltd", status: "Cancelled", since: "2026-06-30" },
  "27AACFK1357N1Z3": { name: "Kesar Crafts & Packaging LLP", status: "Active" },
  "27AABCS9753P1ZI": { name: "Shubh Hampers Pvt Ltd", status: "Active" },
  "29AADCP7531K1Z1": { name: "Palace Grounds Venue Management Pvt Ltd", status: "Active" },
  "29AAEFS8642T1Z3": { name: "Skyline Arena LLP", status: "Active" },
  "08AAKCG2468L1Z3": { name: "GenZ Couture Pvt Ltd", status: "Active" },
  "27AAJFG1122H1ZQ": { name: "Glow & Co. Gifting  LLP", status: "Active" },
  "29AAHCT8642R1Z9": { name: "TicketTrail Events Pvt Ltd", status: "Active" },
};

function norm(s: string | null | undefined) {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(private|pvt|limited|ltd|llp|and|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a?: string | null, b?: string | null) {
  const x = norm(a), y = norm(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
}

function closestRegistered(g: string) {
  // One-character typo search: find a registered GSTIN differing in exactly one position.
  for (const key of Object.keys(MOCK_REGISTRY)) {
    let diff = 0;
    for (let i = 0; i < 15; i++) if (key[i] !== g[i]) diff++;
    if (diff === 1) return key;
  }
  return null;
}

export function runInvoiceChecks(x: InvoiceExtraction, p: Persona): Check[] {
  const checks: Check[] = [];
  const g = (x.supplier_gstin ?? "").replace(/\s/g, "").toUpperCase();
  const v = validateGstin(g);

  if (!g) {
    checks.push({ id: "gstin", label: "Supplier GSTIN", status: "fail", detail: "No GSTIN could be read from the document." });
  } else if (!v.format) {
    checks.push({ id: "gstin", label: "Supplier GSTIN format", status: "fail", detail: `${g} is not a valid GSTIN format.` });
  } else if (!v.checksum) {
    const near = closestRegistered(g);
    checks.push({
      id: "gstin",
      label: "Supplier GSTIN check digit",
      status: "fail",
      detail: near
        ? `${g} fails the check-digit test, likely a typo. Closest registered GSTIN: ${near} (${MOCK_REGISTRY[near].name}). Ask the supplier for a corrected invoice.`
        : `${g} fails the check-digit test. Ask the supplier for a corrected invoice.`,
    });
  } else {
    checks.push({ id: "gstin", label: "Supplier GSTIN format and check digit", status: "pass", detail: `${g} is well-formed.` });
    const reg = MOCK_REGISTRY[g];
    if (!reg) {
      checks.push({ id: "registry", label: "GST registry lookup", status: "warn", detail: "GSTIN not found in the registry sample. A reviewer will verify manually." });
    } else if (reg.status !== "Active") {
      checks.push({
        id: "registry",
        label: "GST registry status",
        status: "fail",
        detail: `Registration is ${reg.status.toLowerCase()}${reg.since ? ` since ${reg.since}` : ""}. Invoices from a cancelled GSTIN can't support the claim.`,
      });
    } else if (!namesMatch(reg.name, x.supplier_name)) {
      checks.push({ id: "registry", label: "GST registry name", status: "warn", detail: `Registered name is "${reg.name}", invoice says "${x.supplier_name}".` });
    } else {
      checks.push({ id: "registry", label: "GST registry status", status: "pass", detail: `Active, registered to ${reg.name}.` });
    }
  }

  const billedToMerchant = namesMatch(x.buyer_name, p.legalName) || (x.buyer_gstin ?? "").toUpperCase() === p.gstin;
  checks.push({
    id: "buyer",
    label: "Billed to this merchant",
    status: billedToMerchant ? "pass" : "fail",
    detail: billedToMerchant ? `Bill-to matches ${p.legalName}.` : `Bill-to "${x.buyer_name ?? "unknown"}" does not match ${p.legalName}.`,
  });

  if (x.invoice_date) {
    const age = daysBetween(x.invoice_date, DEMO_TODAY);
    checks.push({
      id: "date",
      label: "Invoice is recent",
      status: age >= 0 && age <= 60 ? "pass" : "warn",
      detail: age >= 0 ? `Dated ${age} days ago.` : "Dated in the future.",
    });
  }

  const units = x.capacity_or_units ?? 0;
  const need = expectedUnits(p);
  const coverage = need > 0 ? units / need : 0;
  const unit = p.unitLabel;
  checks.push({
    id: "coverage",
    label: p.vertical === "Event ticketing" ? "Venue capacity covers expected tickets" : "Stock covers expected orders",
    status: coverage >= 0.9 ? "pass" : coverage >= 0.7 ? "warn" : "fail",
    detail: units
      ? `${num(units)} ${p.vertical === "Event ticketing" ? "capacity" : "units"} against about ${num(need)} expected ${unit} in the sale window (${Math.round(coverage * 100)}%).`
      : "Couldn't read quantities from the invoice.",
  });

  if (x.line_items?.length && x.taxable_value) {
    const sum = x.line_items.reduce((a, li) => a + (li.amount ?? 0), 0);
    const ok = Math.abs(sum - x.taxable_value) / x.taxable_value < 0.01;
    checks.push({
      id: "math",
      label: "Line items add up",
      status: ok ? "pass" : "warn",
      detail: ok ? "Line items match the taxable value." : `Line items sum to ${num(sum)}, taxable value says ${num(x.taxable_value)}.`,
    });
  }

  if (x.confidence !== "high") {
    checks.push({
      id: "confidence",
      label: "Reading confidence",
      status: "warn",
      detail: `The AI read this document with ${x.confidence} confidence. ${x.notes ?? ""}`.trim(),
    });
  }
  return checks;
}
