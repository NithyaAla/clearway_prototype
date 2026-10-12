"use client";
import { useState } from "react";
import { ArrowRight, Lock, Undo2, Pencil } from "lucide-react";
import { useDemo } from "../store";
import { Button, Card, PageHeader, Pill, Toggle } from "../ui";
import { inr, longDate } from "@/lib/format";
import { AuditLog } from "./AuditLog";

export default function Review() {
  const { s, persona: p, set, go, log } = useDemo();
  const [consent, setConsent] = useState(false);
  const d = s.declaration;
  const passing = s.evidence.filter((e) => !e.checks.some((c) => c.status === "fail"));

  if (!d || !s.declarationConfirmed) {
    return (
      <Card>
        <p className="text-sm text-muted">Confirm your sale declaration first.</p>
        <Button className="mt-3" onClick={() => go("declare")}>
          Go to declaration
        </Button>
      </Card>
    );
  }

  const items = [
    { key: "invoices", label: `Supplier invoices (${passing.length})`, sub: passing.map((e) => e.label).join(", ") || "None passing yet", required: true },
    { key: "history", label: "Sales history, 13 months", sub: `Includes ${p.lastYear.label}` },
    { key: "orderQuality", label: "Order-quality signals", sub: "RTO, repeat shoppers, delivery and dispute rates" },
    { key: "campaign", label: "Campaign signals", sub: p.signals.slice(0, 2).join("; ") },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Step 4 of 7 · Merchant"
        title="Review what ClearWay will share"
        sub="Nothing leaves your account until you approve. You can turn items off, edit the plan, or withdraw at any time, even mid-sale."
        right={s.submitted ? <Pill tone="blue">Submitted · under review</Pill> : s.withdrawn ? <Pill tone="slate">Withdrawn</Pill> : <Pill tone="slate">Draft</Pill>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-ink">Your declaration</h3>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="text-xs text-muted">Sale</div>
                <div className="font-medium">{d.sale_name}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Dates</div>
                <div className="font-medium">
                  {longDate(d.start_date)} to {longDate(d.end_date)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Volume</div>
                <div className="font-medium">
                  {d.expected_multiple}x average, {d.peak_multiple}x peak
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Order value</div>
                <div className="font-medium">
                  {inr(d.aov_low)} to {inr(d.aov_high)}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Shared with Razorpay&apos;s risk team</h3>
            <div className="divide-y divide-line">
              {items.map((it) => (
                <Toggle
                  key={it.key}
                  on={!!s.shared[it.key]}
                  onChange={(v) => {
                    if (it.required && !v) return;
                    set((prev) => ({ shared: { ...prev.shared, [it.key]: v } }));
                    log("Merchant", `${v ? "Included" : "Excluded"} ${it.label.toLowerCase()}.`);
                  }}
                  label={it.label + (it.required ? " · required" : "")}
                  sub={it.sub}
                />
              ))}
            </div>
            <div className="mt-4 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-muted">
              <Lock size={14} className="mt-0.5 shrink-0" />
              Razorpay&apos;s risk team keeps the final decision. Pre-clearance sets an agreed volume range for this sale; it does not override instructions from
              banks or card networks, and it can be paused if real fraud is found.
            </div>

            {!s.submitted ? (
              <div className="mt-5 space-y-4">
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" className="mt-1 accent-[#059669]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  I confirm this information is accurate and agree to share it for this sale only.
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!consent || passing.length === 0}
                    onClick={() => {
                      set({ submitted: true, withdrawn: false, reviewer: null, makerApproved: false, checkerApproved: false, envelope: null });
                      log("Merchant", "Approved and submitted the pre-clearance request.");
                      log("System", "Request filed in the Account Review queue as a declared profile update.");
                    }}
                  >
                    Approve and submit
                  </Button>
                  <Button kind="secondary" onClick={() => go("declare")}>
                    <Pencil size={14} /> Edit declaration
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={() => go("reviewer")}>
                  Switch to the Razorpay reviewer view <ArrowRight size={16} />
                </Button>
                <Button
                  kind="danger"
                  onClick={() => {
                    set({ submitted: false, withdrawn: true, makerApproved: false, checkerApproved: false, envelope: null });
                    log("Merchant", "Withdrew the pre-clearance request.");
                  }}
                >
                  <Undo2 size={14} /> Withdraw
                </Button>
              </div>
            )}
          </Card>
        </div>
        <AuditLog />
      </div>
    </div>
  );
}
