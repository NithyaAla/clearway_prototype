"use client";
// Small UI kit shared by all screens.
import { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2 } from "lucide-react";
import type { AIMode } from "@/lib/types";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, accent }: { children: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div className={cx("rounded-xl border bg-white p-5", accent ? "border-brand-300 bg-brand-50/60 ring-1 ring-brand-200" : "border-line", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type BtnKind = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  children,
  onClick,
  kind = "primary",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const styles: Record<BtnKind, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary: "border border-line bg-white text-ink hover:bg-slate-50",
    ghost: "text-brand-700 hover:bg-brand-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[kind],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "slate" | "blue"; children: ReactNode }) {
  const t = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-red-50 text-red-800 ring-red-200",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-sky-50 text-sky-800 ring-sky-200",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", t)}>{children}</span>;
}

export function ModeBadge({ mode, note }: { mode: AIMode | null | undefined; note?: string }) {
  if (!mode) return null;
  return (
    <span title={note} className="inline-flex items-center">
      {mode === "live" ? (
        <Pill tone="green">
          <Sparkles size={12} /> Live AI
        </Pill>
      ) : (
        <Pill tone="amber">
          <Sparkles size={12} /> Saved example
        </Pill>
      )}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cx("mt-1 text-xl font-semibold tabular-nums", tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-ink")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function CheckRow({ status, label, detail }: { status: "pass" | "warn" | "fail"; label: string; detail: string }) {
  const Icon = status === "pass" ? CheckCircle2 : status === "warn" ? AlertTriangle : XCircle;
  const color = status === "pass" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex gap-3 py-2">
      <Icon size={18} className={cx("mt-0.5 shrink-0", color)} />
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-sm text-muted">{detail}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <Loader2 size={16} className="animate-spin text-brand-600" /> {label}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-start justify-between gap-4 py-3 text-left">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      <span className={cx("relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition", on ? "bg-brand-600" : "bg-slate-300")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}
