// Shapes shared by the API routes and the screens.

export type AIMode = "live" | "demo";

export interface InvoiceLineItem {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
}

export interface InvoiceExtraction {
  supplier_name: string | null;
  supplier_gstin: string | null;
  buyer_name: string | null;
  buyer_gstin: string | null;
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  line_items: InvoiceLineItem[];
  capacity_or_units: number | null;
  taxable_value: number | null;
  gst_amount: number | null;
  total_amount: number | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

export interface Check {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface Declaration {
  sale_name: string;
  start_date: string;
  end_date: string;
  expected_multiple: number;
  peak_multiple: number;
  aov_low: number;
  aov_high: number;
  channels: string[];
  rationale: string;
  questions_for_merchant: string[];
}

export interface ReviewerSummary {
  headline: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: "Pre-clear" | "Pre-clear with conditions" | "Needs more evidence";
  recommended_envelope: {
    max_multiple: number;
    aov_band_pct: number;
    reserve_pct: number;
    reserve_days: number;
  };
}

export interface Nudge {
  title: string;
  message: string;
  actions: { id: string; label: string }[];
}

export interface AIResponse<T> {
  mode: AIMode;
  data: T;
  note?: string; // why demo mode was used
}
