"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Play, Pause, RotateCcw, SkipForward, ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";
import { postJSON, useDemo } from "../store";
import { Button, Card, cx, ModeBadge, PageHeader, Pill, Stat } from "../ui";
import { counterfactual, MDR, REVIEW_HOURS, Scenario, SCENARIOS, simulate, totalGmv, UNDECLARED_HOLD_TRIGGER } from "@/lib/simulate";
import { inr } from "@/lib/format";
import type { Nudge } from "@/lib/types";
import type { AIMode } from "@/lib/types";

interface Alert {
  kind: "overshoot" | "card_testing";
  at: number;
  nudge?: Nudge;
  mode?: AIMode;
  resolved?: string;
  resolvedAt?: number;
}

export default function Live() {
  const { s, persona: p, set, go, log } = useDemo();
  const approved = s.makerApproved && s.checkerApproved && s.envelope;
  const env = s.envelope ?? { maxMultiple: p.defaultEnvelope.maxMultiple, aovBandPct: 30, reservePct: 0, reserveDays: 0 };
  const [scenario, setScenario] = useState<Scenario>("within");
  const points = useMemo(() => simulate(p, scenario, env.maxMultiple), [p, scenario, env.maxMultiple]);
  const cf = useMemo(() => counterfactual(points), [points]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reserveFrom, setReserveFrom] = useState<number | null>(null);
  const [protectedAt, setProtectedAt] = useState<number | null>(null);
  const [widenedTo, setWidenedTo] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const last = points.length - 1;
  const done = idx >= last;

  const restart = useCallback(() => {
    setIdx(0);
    setPlaying(false);
    setAlerts([]);
    setReserveFrom(null);
    setProtectedAt(null);
    setWidenedTo(null);
  }, []);

  useEffect(() => {
    restart();
  }, [scenario, restart]);

  useEffect(() => {
    if (!playing) return;
    const step = points.length > 120 ? 2 : 1;
    timer.current = setInterval(() => setIdx((i) => Math.min(last, i + step)), 70);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, last, points.length]);

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  const raise = useCallback(
    async (kind: Alert["kind"], at: number, currentMultiple: number) => {
      setPlaying(false);
      setAlerts((a) => [...a, { kind, at }]);
      log(
        "System",
        kind === "overshoot"
          ? `Volume reached ${currentMultiple.toFixed(1)}x, above the ${env.maxMultiple}x envelope. Raised "Needs clarification". Settlements continue.`
          : "Card-testing pattern detected on checkout. Case marked: merchant is the victim. Settlements continue.",
      );
      try {
        const r = await postJSON<Nudge>("/api/nudge", { personaId: p.id, scenario: kind, currentMultiple, envelopeMax: env.maxMultiple });
        setAlerts((a) => a.map((x) => (x.kind === kind ? { ...x, nudge: r.data, mode: r.mode } : x)));
        set({ lastMode: r.mode });
      } catch {
        /* the alert still shows without the AI message */
      }
    },
    [env.maxMultiple, log, p.id, set],
  );

  // Watch for envelope breaches and card-testing as the sale plays
  useEffect(() => {
    const pt = points[idx];
    if (!pt) return;
    const ceiling = widenedTo ?? env.maxMultiple;
    if (pt.trailingMultiple > ceiling && !alerts.some((a) => a.kind === "overshoot")) raise("overshoot", idx, Math.max(Math.ceil(pt.trailingMultiple * 10) / 10, ceiling + 0.1));
    if (pt.cardAttempts > 100 && !alerts.some((a) => a.kind === "card_testing")) raise("card_testing", idx, pt.trailingMultiple);
  }, [idx, points, alerts, env.maxMultiple, widenedTo, raise]);

  function skip() {
    // Jump to the next moment that needs the merchant, or to the end.
    const ceiling = widenedTo ?? env.maxMultiple;
    const next = points.findIndex(
      (pt, i) =>
        i > idx &&
        ((pt.trailingMultiple > ceiling && !alerts.some((a) => a.kind === "overshoot")) ||
          (pt.cardAttempts > 100 && !alerts.some((a) => a.kind === "card_testing"))),
    );
    setIdx(next > 0 ? next : last);
  }

  function act(alert: Alert, actionId: string, label: string) {
    setAlerts((a) => a.map((x) => (x === alert ? { ...x, resolved: label, resolvedAt: idx } : x)));
    if (actionId === "evidence") {
      const peak = Math.max(...points.map((x) => x.trailingMultiple));
      const widened = Math.ceil(peak * 1.15);
      setWidenedTo(widened);
      log("Merchant", "Added a stock confirmation and the latest supplier invoice.");
      log("Risk maker", `Clarification closed. Envelope widened to ${widened}x for the rest of the sale.`);
    } else if (actionId === "reserve") {
      setReserveFrom(idx);
      setWidenedTo(Math.ceil(Math.max(...points.map((x) => x.trailingMultiple)) * 1.15));
      log("Merchant", "Accepted a temporary 10% reserve for 14 days instead of a hold.");
    } else if (actionId === "pause") {
      log("Merchant", "Paused ad campaigns to slow the spike.");
      setWidenedTo(Math.ceil(Math.max(...points.map((x) => x.trailingMultiple)) * 1.15));
    } else if (actionId === "challenge" || actionId === "ratelimit") {
      setProtectedAt(idx);
      log("Merchant", `Turned on protection: ${label}.`);
    } else {
      log("Merchant", `Chose: ${label}.`);
    }
    setPlaying(true);
  }

  // Money so far
  const sofar = points.slice(0, idx + 1);
  const gmvSoFar = totalGmv(sofar);
  const baseReserve = env.reservePct / 100;
  let reserveHeld = 0, reserveGmvDays = 0;
  sofar.forEach((pt) => {
    const extra = reserveFrom !== null && pt.i >= reserveFrom ? 0.1 : 0;
    reserveHeld += pt.gmv * (baseReserve + extra);
    reserveGmvDays += pt.gmv * (baseReserve * env.reserveDays + extra * 14);
  });
  const settled = gmvSoFar * (1 - MDR) - reserveHeld;
  const cfHeldSoFar = cf.triggerIndex !== null && idx >= cf.triggerIndex ? totalGmv(points.slice(cf.triggerIndex, idx + 1)) : 0;

  const openAlert = alerts.find((a) => !a.resolved);
  const status = openAlert
    ? openAlert.kind === "overshoot"
      ? { tone: "amber" as const, label: "Needs clarification · settlements flowing", Icon: AlertTriangle }
      : { tone: "red" as const, label: "Victim alert · settlements flowing", Icon: ShieldAlert }
    : { tone: "green" as const, label: "Pre-cleared · settlements flowing", Icon: ShieldCheck };

  const chartData = points.map((pt) => ({
    label: pt.label,
    multiple: pt.i <= idx ? pt.trailingMultiple : null,
    envelope: widenedTo !== null && alerts.some((a) => a.resolvedAt !== undefined && pt.i >= a.resolvedAt && a.kind === "overshoot") ? widenedTo : env.maxMultiple,
    attempts: pt.i <= idx ? (protectedAt !== null && pt.i > protectedAt ? Math.round(pt.cardAttempts * 0.05) : pt.cardAttempts) : null,
  }));

  function finish() {
    const all = points;
    let rh = 0, rgd = 0;
    all.forEach((pt) => {
      const extra = reserveFrom !== null && pt.i >= reserveFrom ? 0.1 : 0;
      rh += pt.gmv * (baseReserve + extra);
      rgd += pt.gmv * (baseReserve * env.reserveDays + extra * 14);
    });
    set({
      live: {
        scenario,
        points: all,
        totalGmv: totalGmv(all),
        cf,
        reserveHeld: rh,
        reserveGmvDays: rgd,
        clarifications: alerts.filter((a) => a.kind === "overshoot").length,
        victimFlag: alerts.some((a) => a.kind === "card_testing"),
        actions: alerts.filter((a) => a.resolved).map((a) => a.resolved!),
      },
    });
    log("System", `Sale ended. ${inr(totalGmv(all), { compact: true })} collected; nothing frozen.`);
    go("outcome");
  }

  if (!approved) {
    return (
      <Card>
        <p className="text-sm text-muted">The sale needs to be pre-cleared by the risk team first.</p>
        <Button className="mt-3" onClick={() => go(s.submitted ? "reviewer" : "review")}>
          {s.submitted ? "Go to the reviewer view" : "Go to merchant review"}
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Step 6 of 7 · Live sale (simulated)"
        title={`${p.sale.name}, live`}
        sub="Press play to run the sale hour by hour. Pick a scenario to see how ClearWay handles a sale that goes to plan, one that beats it, and a fraud attack."
        right={
          <Pill tone={status.tone}>
            <status.Icon size={12} /> {status.label}
          </Pill>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setScenario(sc.id)}
            className={cx(
              "rounded-xl border bg-white p-4 text-left transition",
              scenario === sc.id ? "border-brand-500 ring-2 ring-brand-100" : "border-line hover:border-slate-300",
            )}
          >
            <div className="text-sm font-semibold text-ink">{sc.label}</div>
            <div className="mt-0.5 text-xs text-muted">{sc.blurb}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Volume vs your pre-cleared envelope</h3>
                <p className="text-xs text-muted">Trailing 24 hours, as a multiple of a normal day · {points[idx]?.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button kind="secondary" onClick={() => setPlaying((v) => !v)} disabled={done}>
                  {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : idx === 0 ? "Play" : "Resume"}
                </Button>
                <Button kind="ghost" onClick={skip} disabled={done || !!openAlert}>
                  <SkipForward size={14} /> Skip
                </Button>
                <Button kind="ghost" onClick={restart}>
                  <RotateCcw size={14} />
                </Button>
              </div>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -10, right: 12, top: 10 }}>
                  <CartesianGrid vertical={false} stroke="#eef1f5" />
                  <XAxis dataKey="label" interval={23} tickFormatter={(l: string) => l.split(" ").slice(0, 2).join(" ")} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} domain={[0, (max: number) => Math.ceil(Math.max(max, env.maxMultiple) * 1.15)]} />
                  <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)}x`, n === "multiple" ? "Volume" : "Envelope"]} />
                  <ReferenceLine y={UNDECLARED_HOLD_TRIGGER} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Undeclared review trigger (illustrative)", position: "insideBottomRight", fontSize: 11, fill: "#b91c1c" }} />
                  {cf.triggerIndex !== null && idx >= cf.triggerIndex && (
                    <ReferenceLine x={points[cf.triggerIndex].label} stroke="#ef4444" strokeOpacity={0.5} label={{ value: "Hold would start", position: "insideTopLeft", fontSize: 11, fill: "#b91c1c" }} />
                  )}
                  <Line type="stepAfter" dataKey="envelope" stroke="#64748b" strokeDasharray="6 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  <Line type="monotone" dataKey="multiple" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-600" /> Volume</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-slate-500" /> Pre-cleared envelope</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-red-500" /> Where an undeclared spike could trigger a review</span>
            </div>
          </Card>

          {scenario === "card_testing" && (
            <Card>
              <h3 className="text-sm font-semibold text-ink">Tiny card payments per hour</h3>
              <p className="text-xs text-muted">Card testing: fraudsters check stolen cards with ₹1 to ₹10 payments</p>
              <div className="mt-3 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -10, right: 12 }}>
                    <XAxis dataKey="label" interval={23} tickFormatter={(l: string) => l.split(" ").slice(0, 2).join(" ")} tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [v, "Attempts"]} />
                    <Bar dataKey="attempts" fill="#ef4444" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {alerts.map((a, i) => (
            <AlertCard key={i} alert={a} onAct={(id, label) => act(a, id, label)} />
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label="Collected so far" value={inr(gmvSoFar, { compact: true })} />
            <Stat label="Settling on schedule" value={inr(settled, { compact: true })} sub="After fees and any agreed reserve" tone="good" />
            <Stat label="Frozen with ClearWay" value="₹0" sub={reserveHeld > 0 ? `${inr(reserveHeld, { compact: true })} in an agreed reserve` : "No holds"} tone="good" />
          </div>
          <Card className="border-red-200 bg-red-50/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-800">Without ClearWay</div>
            {cf.triggerIndex === null ? (
              <p className="mt-2 text-sm text-ink">This sale never crosses the illustrative review trigger.</p>
            ) : idx < cf.triggerIndex ? (
              <p className="mt-2 text-sm text-ink">Volume hasn&apos;t crossed {UNDECLARED_HOLD_TRIGGER}x yet. Watch what happens when it does.</p>
            ) : (
              <>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-red-700">{inr(cfHeldSoFar, { compact: true })}</div>
                <p className="mt-1 text-sm text-ink">
                  held from {points[cf.triggerIndex].label}, released about {REVIEW_HOURS} hours after the sale ends.
                </p>
              </>
            )}
            <p className="mt-3 text-xs text-muted">
              Illustrative assumption: an unannounced spike above {UNDECLARED_HOLD_TRIGGER}x normal triggers a review hold with a {REVIEW_HOURS}-hour review.
            </p>
          </Card>
          {done && (
            <Button className="w-full" onClick={finish}>
              See the outcome <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onAct }: { alert: Alert; onAct: (id: string, label: string) => void }) {
  const isFraud = alert.kind === "card_testing";
  return (
    <Card className={isFraud ? "border-red-200" : "border-amber-200"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          {isFraud ? <ShieldAlert size={16} className="text-red-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
          {alert.nudge?.title ?? (isFraud ? "Card-testing attack detected" : "Sales are above your plan")}
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="slate">Message to merchant</Pill>
          <ModeBadge mode={alert.mode} />
        </div>
      </div>
      {alert.nudge ? (
        <p className="mt-2 text-sm leading-relaxed text-ink">{alert.nudge.message}</p>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <Sparkles size={14} className="text-brand-600" /> ClearWay is writing a message…
        </p>
      )}
      {alert.resolved ? (
        <div className="mt-3 text-sm font-medium text-emerald-700">Merchant chose: {alert.resolved}</div>
      ) : (
        alert.nudge && (
          <div className="mt-4 flex flex-wrap gap-2">
            {alert.nudge.actions.map((a, i) => (
              <Button key={a.id} kind={i === 0 ? "primary" : "secondary"} onClick={() => onAct(a.id, a.label)}>
                {a.label}
              </Button>
            ))}
          </div>
        )
      )}
    </Card>
  );
}
