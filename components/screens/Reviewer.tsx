"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Building2, Sparkles, UserCheck, ShieldAlert } from "lucide-react";
import { Envelope, postJSON, useDemo } from "../store";
import { Button, Card, CheckRow, Field, inputCls, ModeBadge, PageHeader, Pill, Spinner } from "../ui";
import type { ReviewerSummary } from "@/lib/types";
import { generateHistory } from "@/lib/history";
import { inr, longDate, shortDate } from "@/lib/format";
import { AuditLog } from "./AuditLog";

export default function Reviewer() {
  const { s, persona: p, set, go, log } = useDemo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);
  const history = useMemo(() => generateHistory(p).slice(-400), [p]);
  const d = s.declaration;
  const passing = s.evidence.filter((e) => !e.checks.some((c) => c.status === "fail"));
  const sharedChecks = s.shared.invoices ? passing.flatMap((e) => e.checks) : [];

  async function fetchSummary() {
    if (!d) return;
    setLoading(true);
    setError(null);
    try {
      const sharedItems = Object.entries(s.shared).filter(([, v]) => v).map(([k]) => k);
      const r = await postJSON<ReviewerSummary>("/api/reviewer-summary", { personaId: p.id, declaration: d, checks: sharedChecks, sharedItems });
      const e = r.data.recommended_envelope;
      set({
        reviewer: { summary: r.data, mode: r.mode, note: r.note },
        envelope: { maxMultiple: e.max_multiple, aovBandPct: e.aov_band_pct, reservePct: e.reserve_pct, reserveDays: e.reserve_days },
        lastMode: r.mode,
      });
      log("ClearWay agent", `Prepared the reviewer brief: "${r.data.recommendation}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the brief");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (s.submitted && !s.reviewer && !asked.current) {
      asked.current = true;
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.submitted]);

  if (!s.submitted || !d) {
    return (
      <Card>
        <p className="text-sm text-muted">The merchant hasn&apos;t submitted a pre-clearance request yet.</p>
        <Button className="mt-3" onClick={() => go("review")}>
          Go to merchant review
        </Button>
      </Card>
    );
  }

  const r = s.reviewer?.summary;
  const env = s.envelope;
  const setEnv = (patch: Partial<Envelope>) => env && set({ envelope: { ...env, ...patch }, makerApproved: false, checkerApproved: false });
  const approved = s.makerApproved && s.checkerApproved;
  const recTone = r?.recommendation === "Pre-clear" ? "green" : r?.recommendation === "Needs more evidence" ? "red" : "amber";

  return (
    <div>
      <div className="mb-5 flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2 text-sm text-violet-900 ring-1 ring-violet-200">
        <Building2 size={16} /> Internal view: Razorpay risk operations (simulated). The merchant never sees this screen.
      </div>
      <PageHeader
        eyebrow="Step 5 of 7 · Razorpay risk"
        title={`Pre-clearance request: ${p.legalName}`}
        sub={`${d.sale_name}, ${longDate(d.start_date)} to ${longDate(d.end_date)} · ${p.vertical} · declared ${d.expected_multiple}x average, ${d.peak_multiple}x peak`}
        right={approved ? <Pill tone="green">Pre-cleared</Pill> : <Pill tone="blue">Awaiting decision</Pill>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Sparkles size={15} className="text-brand-600" /> ClearWay brief
              </h3>
              <div className="flex items-center gap-2">
                {r && <Pill tone={recTone}>{r.recommendation}</Pill>}
                <ModeBadge mode={s.reviewer?.mode} note={s.reviewer?.note} />
              </div>
            </div>
            {loading && <div className="mt-3"><Spinner label="Reading the case file…" /></div>}
            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}{" "}
                <button className="underline" onClick={fetchSummary}>
                  Try again
                </button>
              </div>
            )}
            {r && (
              <div className="mt-3">
                <div className="text-base font-semibold text-ink">{r.headline}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.summary}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Supports the case</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink">
                      {r.strengths.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Worth a look</div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink">
                      {r.concerns.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted">The brief assists the decision. A maker and a checker on the risk team approve or reject.</p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Daily collections, last 13 months</h3>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={50} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => inr(v, { compact: true })} width={64} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [inr(Number(v)), "Collections"]} labelFormatter={(l) => longDate(String(l))} />
                  <Area type="monotone" dataKey="gmv" stroke="#7c3aed" strokeWidth={1.5} fill="#7c3aed" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Evidence received</h3>
            {sharedChecks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No invoices were shared.</p>
            ) : (
              <div className="mt-1 divide-y divide-line">
                {sharedChecks.map((c, i) => (
                  <CheckRow key={i} {...c} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card accent={approved}>
            <h3 className="text-sm font-semibold text-ink">Pre-cleared envelope</h3>
            <p className="mt-1 text-xs text-muted">Inside this range, anomalies raise a question, not a freeze. Prefilled from the brief; edit as needed.</p>
            {env ? (
              <div className="mt-4 space-y-3">
                <Field label="Volume ceiling (x normal, 24-hour basis)">
                  <input type="number" step="0.5" className={inputCls} value={env.maxMultiple} onChange={(e) => setEnv({ maxMultiple: Number(e.target.value) })} />
                </Field>
                <Field label="Order value band (± % around normal)">
                  <input type="number" className={inputCls} value={env.aovBandPct} onChange={(e) => setEnv({ aovBandPct: Number(e.target.value) })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rolling reserve (%)">
                    <input type="number" className={inputCls} value={env.reservePct} onChange={(e) => setEnv({ reservePct: Number(e.target.value) })} />
                  </Field>
                  <Field label="Reserve days">
                    <input type="number" className={inputCls} value={env.reserveDays} onChange={(e) => setEnv({ reserveDays: Number(e.target.value) })} />
                  </Field>
                </div>
                <p className="text-xs text-muted">{p.envelopeNote}</p>
              </div>
            ) : (
              <div className="mt-3">
                <Spinner label="Waiting for the brief…" />
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Maker-checker approval</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-ink">Maker: Priya S.</div>
                  <div className="text-xs text-muted">Risk operations analyst</div>
                </div>
                {s.makerApproved ? (
                  <Pill tone="green">
                    <UserCheck size={12} /> Approved
                  </Pill>
                ) : (
                  <Button
                    kind="secondary"
                    disabled={!env}
                    onClick={() => {
                      set({ makerApproved: true });
                      log("Risk maker", `Approved envelope: up to ${env!.maxMultiple}x, AOV ±${env!.aovBandPct}%, reserve ${env!.reservePct}%${env!.reservePct ? ` for ${env!.reserveDays} days` : ""}.`);
                    }}
                  >
                    Approve
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium text-ink">Checker: Arjun M.</div>
                  <div className="text-xs text-muted">Risk lead</div>
                </div>
                {s.checkerApproved ? (
                  <Pill tone="green">
                    <UserCheck size={12} /> Confirmed
                  </Pill>
                ) : (
                  <Button
                    kind="secondary"
                    disabled={!s.makerApproved}
                    onClick={() => {
                      set({ checkerApproved: true });
                      log("Risk checker", "Confirmed the envelope. Sale is pre-cleared.");
                      log("System", "Merchant notified: sale pre-cleared, settlements will continue on schedule.");
                    }}
                  >
                    Confirm
                  </Button>
                )}
              </div>
            </div>
            {!approved && (
              <button
                onClick={() => {
                  set({ submitted: false, needsMoreEvidence: true, reviewer: null, envelope: null, makerApproved: false });
                  log("Risk maker", "Requested more evidence from the merchant.");
                  go("evidence");
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber-800 hover:underline"
              >
                <ShieldAlert size={14} /> Request more evidence instead
              </button>
            )}
            {approved && (
              <Button className="mt-4 w-full" onClick={() => go("live")}>
                Run the live sale <ArrowRight size={16} />
              </Button>
            )}
          </Card>
          <AuditLog />
        </div>
      </div>
    </div>
  );
}
