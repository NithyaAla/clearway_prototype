"use client";
// All demo state lives here, in the browser. Refreshing the page resets the demo.
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { PERSONAS, PersonaId } from "@/lib/personas";
import type { AIMode, Check, Declaration, InvoiceExtraction, Nudge, ReviewerSummary } from "@/lib/types";
import type { Counterfactual, HourPoint, Scenario } from "@/lib/simulate";

export type Step = "home" | "declare" | "evidence" | "review" | "reviewer" | "live" | "outcome";

export const STEPS: { id: Step; label: string; who: "Merchant" | "Razorpay risk" | "Results" }[] = [
  { id: "home", label: "Merchant home", who: "Merchant" },
  { id: "declare", label: "Declare the sale", who: "Merchant" },
  { id: "evidence", label: "Evidence pack", who: "Merchant" },
  { id: "review", label: "Review and approve", who: "Merchant" },
  { id: "reviewer", label: "Risk reviewer dashboard", who: "Razorpay risk" },
  { id: "live", label: "Live sale", who: "Results" },
  { id: "outcome", label: "Outcome", who: "Results" },
];

export interface EvidenceItem {
  id: string;
  label: string;
  sampleId?: string;
  previewUrl: string;
  extraction: InvoiceExtraction;
  checks: Check[];
  mode: AIMode;
  note?: string;
}

export interface Envelope {
  maxMultiple: number;
  aovBandPct: number;
  reservePct: number;
  reserveDays: number;
}

export interface AuditEntry {
  time: string;
  actor: "Merchant" | "ClearWay agent" | "Risk maker" | "Risk checker" | "System";
  text: string;
}

export interface LiveResult {
  scenario: Scenario;
  points: HourPoint[];
  totalGmv: number;
  cf: Counterfactual;
  reserveHeld: number;
  reserveGmvDays: number;
  clarifications: number;
  victimFlag: boolean;
  actions: string[];
}

export interface DemoState {
  personaId: PersonaId;
  step: Step;
  declaration: Declaration | null;
  declarationMode: AIMode | null;
  declarationConfirmed: boolean;
  evidence: EvidenceItem[];
  shared: Record<string, boolean>;
  submitted: boolean;
  withdrawn: boolean;
  needsMoreEvidence: boolean;
  reviewer: { summary: ReviewerSummary; mode: AIMode; note?: string } | null;
  envelope: Envelope | null;
  makerApproved: boolean;
  checkerApproved: boolean;
  nudges: { key: string; nudge: Nudge; mode: AIMode; resolved?: string }[];
  live: LiveResult | null;
  audit: AuditEntry[];
  lastMode: AIMode | null;
}

function initial(personaId: PersonaId): DemoState {
  return {
    personaId,
    step: "home",
    declaration: null,
    declarationMode: null,
    declarationConfirmed: false,
    evidence: [],
    shared: { invoices: true, history: true, orderQuality: true, campaign: true },
    submitted: false,
    withdrawn: false,
    needsMoreEvidence: false,
    reviewer: null,
    envelope: null,
    makerApproved: false,
    checkerApproved: false,
    nudges: [],
    live: null,
    audit: [],
    lastMode: null,
  };
}

interface Ctx {
  s: DemoState;
  persona: (typeof PERSONAS)[PersonaId];
  set: (patch: Partial<DemoState> | ((s: DemoState) => Partial<DemoState>)) => void;
  go: (step: Step) => void;
  log: (actor: AuditEntry["actor"], text: string) => void;
  reset: (personaId?: PersonaId) => void;
}

const DemoCtx = createContext<Ctx | null>(null);

function clock() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<DemoState>(() => initial("genz"));
  const set = useCallback<Ctx["set"]>((patch) => setS((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) })), []);
  const go = useCallback((step: Step) => {
    setS((prev) => ({ ...prev, step }));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const log = useCallback<Ctx["log"]>((actor, text) => setS((prev) => ({ ...prev, audit: [{ time: clock(), actor, text }, ...prev.audit] })), []);
  const reset = useCallback((personaId?: PersonaId) => setS((prev) => initial(personaId ?? prev.personaId)), []);
  const value = useMemo(() => ({ s, persona: PERSONAS[s.personaId], set, go, log, reset }), [s, set, go, log, reset]);
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const c = useContext(DemoCtx);
  if (!c) throw new Error("useDemo must be used inside DemoProvider");
  return c;
}

export function stepDone(s: DemoState, step: Step) {
  switch (step) {
    case "home":
      return s.step !== "home" || s.declaration !== null;
    case "declare":
      return s.declarationConfirmed;
    case "evidence":
      return s.evidence.some((e) => !e.checks.some((c) => c.status === "fail"));
    case "review":
      return s.submitted;
    case "reviewer":
      return s.makerApproved && s.checkerApproved;
    case "live":
      return s.live !== null;
    case "outcome":
      return false;
  }
}

/** Generic POST helper for the AI routes. */
export async function postJSON<T>(url: string, body: unknown): Promise<{ mode: AIMode; note?: string; data: T }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}
