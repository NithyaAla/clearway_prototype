"use client";
import { RotateCcw, TrendingUp, ShieldCheck, Repeat2 } from "lucide-react";
import { useDemo } from "../store";
import { Button, Card, PageHeader, Pill, Stat } from "../ui";
import { inr, num } from "@/lib/format";
import { COST_OF_CAPITAL, dayMultipliersFor, MDR, SCENARIOS, workingCapitalValue } from "@/lib/simulate";

export default function Outcome() {
  const { s, persona: p, go } = useDemo();
  const r = s.live;
  if (!r) {
    return (
      <Card>
        <p className="text-sm text-muted">Run the live sale first to see the outcome.</p>
        <Button className="mt-3" onClick={() => go("live")}>
          Go to live sale
        </Button>
      </Card>
    );
  }

  const protectedValue = Math.max(0, r.cf.heldGmv - r.reserveHeld);
  const gmvDaysAvoided = Math.max(0, r.cf.heldGmvDays - r.reserveGmvDays);
  const wcValue = workingCapitalValue(gmvDaysAvoided);
  const onSchedule = r.totalGmv > 0 ? 1 - r.reserveHeld / r.totalGmv : 1;
  const declaredPeak = s.declaration?.peak_multiple ?? Math.max(...p.sale.dayMultipliers);
  const actualPeak = Math.max(...dayMultipliersFor(p, r.scenario));
  const accuracy = actualPeak / declaredPeak;
  const accurate = accuracy <= 1.25 && accuracy >= 0.75;
  const env = s.envelope!;
  const nextEnvelope = accurate ? Math.round(env.maxMultiple * 1.1 * 2) / 2 : Math.ceil(actualPeak * 1.15);
  const scenarioLabel = SCENARIOS.find((x) => x.id === r.scenario)?.label;

  return (
    <div>
      <PageHeader
        eyebrow={`Step 7 of 7 · Outcome · ${scenarioLabel}`}
        title={`${inr(protectedValue, { compact: true })} kept settling that would otherwise have been held`}
        sub={`Settlement Value Protected for ${p.name}'s ${p.sale.name}, compared with the same sale run without pre-clearance.`}
        right={<Pill tone="green">No freezes</Pill>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Settlement Value Protected" value={inr(protectedValue, { compact: true })} sub="North-star metric" tone="good" />
        <Stat label="Working-capital cost avoided" value={inr(wcValue, { compact: true })} sub={`At ${COST_OF_CAPITAL * 100}% a year`} tone="good" />
        <Stat label="Average hold avoided" value={`${r.cf.avgHeldDays.toFixed(1)} days`} sub={`On ${inr(r.cf.heldGmv, { compact: true })} of sales`} />
        <Stat label="Settled on schedule" value={`${(onSchedule * 100).toFixed(onSchedule < 1 ? 1 : 0)}%`} sub={r.reserveHeld ? `${inr(r.reserveHeld, { compact: true })} in agreed reserve` : "No reserve"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp size={15} className="text-brand-600" /> What happened
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            <li>
              {inr(r.totalGmv, { compact: true })} collected; {inr(r.totalGmv * (1 - MDR) - r.reserveHeld, { compact: true })} settled after fees.
            </li>
            <li>
              {r.clarifications ? `${r.clarifications} clarification raised and closed while settlements kept flowing.` : "No clarifications needed: the sale stayed inside its envelope."}
            </li>
            {r.victimFlag && <li>Card-testing attack caught and the case marked &quot;merchant is victim&quot;, so it didn&apos;t count against the account.</li>}
            {r.actions.length > 0 && <li>Merchant decisions: {r.actions.join("; ")}.</li>}
            <li>
              Without ClearWay, about {inr(r.cf.heldGmv, { compact: true })} would have been held for {r.cf.avgHeldDays.toFixed(1)} days on average.
            </li>
          </ul>
        </Card>

        <Card>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldCheck size={15} className="text-brand-600" /> Guardrail: fraud and chargebacks
          </h3>
          <p className="mt-2 text-sm text-muted">Pre-clearance only works if it doesn&apos;t let bad actors through. ClearWay tracks this cohort against a matched control group.</p>
          <div className="mt-3 space-y-2 text-sm">
            {[30, 60, 120].map((d) => (
              <div key={d} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>Chargeback and fraud-report rate at {d} days</span>
                <Pill tone="slate">Pending</Pill>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">If pre-cleared merchants show more fraud than controls, envelopes tighten automatically for that category.</p>
        </Card>

        <Card>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Repeat2 size={15} className="text-brand-600" /> What ClearWay learned
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Declared peak</span>
              <span className="font-medium tabular-nums">{declaredPeak}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Actual peak day</span>
              <span className="font-medium tabular-nums">{actualPeak.toFixed(1)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Declaration accuracy</span>
              <span className="font-medium tabular-nums">{num(accuracy * 100)}% of plan</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
            {accurate
              ? `Accurate declaration. ${p.name} moves up a trust tier: next ${p.vertical === "Event ticketing" ? "launch" : "festive sale"} starts with a ${nextEnvelope}x envelope and faster review.`
              : `The sale beat the plan by ${num((accuracy - 1) * 100)}%. Next time ClearWay will suggest a peak near ${nextEnvelope}x so the envelope fits from the start.`}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => go("live")}>Try another scenario</Button>
        <Button kind="secondary" onClick={() => go("home")}>
          <RotateCcw size={14} /> Back to merchant home
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted">
        All figures are simulated for this prototype. Working-capital value = held amount × days held × {COST_OF_CAPITAL * 100}% ÷ 365.
      </p>
    </div>
  );
}
