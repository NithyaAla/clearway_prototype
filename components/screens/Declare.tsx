"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { postJSON, useDemo } from "../store";
import { Button, Card, Field, inputCls, ModeBadge, PageHeader, Spinner } from "../ui";
import type { Declaration } from "@/lib/types";
import { addDays, inr, shortDate } from "@/lib/format";

export default function Declare() {
  const { s, persona: p, set, go, log } = useDemo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const d = s.declaration;

  async function draft() {
    setLoading(true);
    setError(null);
    try {
      const r = await postJSON<Declaration>("/api/draft-declaration", { personaId: p.id });
      set({ declaration: r.data, declarationMode: r.mode, lastMode: r.mode, declarationConfirmed: false });
      log("ClearWay agent", `Drafted the declaration from 13 months of history and ${p.signals.length} campaign signals.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!s.declaration && !started.current) {
      started.current = true;
      draft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Declaration>) => d && set({ declaration: { ...d, ...patch }, declarationConfirmed: false });

  const chart = useMemo(() => {
    const ly = p.sale.dayMultipliers.map((m) => (m / Math.max(...p.sale.dayMultipliers)) * p.lastYear.peakMultiple);
    return p.sale.dayMultipliers.map((m, i) => ({
      day: shortDate(addDays(p.sale.start, i)),
      "This year (planned)": +(m * (d ? d.peak_multiple / Math.max(...p.sale.dayMultipliers) : 1)).toFixed(1),
      "Last year (actual)": +ly[i].toFixed(1),
    }));
  }, [p, d]);

  return (
    <div>
      <PageHeader
        eyebrow="Step 2 of 7 · Merchant"
        title="Declare your sale"
        sub="ClearWay drafted this from your sales history and campaign signals. Check it and adjust anything that's off: an accurate plan is what keeps settlements flowing."
        right={<ModeBadge mode={s.declarationMode} />}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {loading && !d && <Spinner label="Reading your sales history and campaign signals…" />}
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}{" "}
              <button className="underline" onClick={draft}>
                Try again
              </button>
            </div>
          )}
          {d && (
            <div className="space-y-4">
              <Field label="Sale name">
                <input className={inputCls} value={d.sale_name} onChange={(e) => update({ sale_name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Starts">
                  <input type="date" className={inputCls} value={d.start_date} onChange={(e) => update({ start_date: e.target.value })} />
                </Field>
                <Field label="Ends">
                  <input type="date" className={inputCls} value={d.end_date} onChange={(e) => update({ end_date: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Expected average volume" hint={`About ${inr(d.expected_multiple * p.baselineDailyGmv, { compact: true })} a day`}>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" min="1" className={inputCls} value={d.expected_multiple} onChange={(e) => update({ expected_multiple: Number(e.target.value) })} />
                    <span className="text-sm text-muted">x normal</span>
                  </div>
                </Field>
                <Field label="Expected peak day" hint={`About ${inr(d.peak_multiple * p.baselineDailyGmv, { compact: true })} on the busiest day`}>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" min="1" className={inputCls} value={d.peak_multiple} onChange={(e) => update({ peak_multiple: Number(e.target.value) })} />
                    <span className="text-sm text-muted">x normal</span>
                  </div>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Average order value, low (₹)">
                  <input type="number" className={inputCls} value={d.aov_low} onChange={(e) => update({ aov_low: Number(e.target.value) })} />
                </Field>
                <Field label="Average order value, high (₹)">
                  <input type="number" className={inputCls} value={d.aov_high} onChange={(e) => update({ aov_high: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Sales channels" hint="Comma-separated">
                <input className={inputCls} value={d.channels.join(", ")} onChange={(e) => update({ channels: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
              </Field>

              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-ink">
                  <Sparkles size={14} className="text-brand-600" /> Why ClearWay suggested these numbers
                </div>
                <p className="text-muted">{d.rationale}</p>
                {d.questions_for_merchant?.length > 0 && (
                  <>
                    <div className="mt-3 font-medium text-ink">Worth checking before you submit</div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                      {d.questions_for_merchant.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    set({ declarationConfirmed: true });
                    log("Merchant", `Confirmed declaration: ${d.sale_name}, ${d.start_date} to ${d.end_date}, ${d.expected_multiple}x average, ${d.peak_multiple}x peak.`);
                    go("evidence");
                  }}
                >
                  Confirm and add evidence <ArrowRight size={16} />
                </Button>
                <Button kind="ghost" onClick={draft} disabled={loading}>
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Redraft
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink">Planned volume vs last year</h3>
          <p className="mt-1 text-xs text-muted">Daily volume as a multiple of your normal day</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -16, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef1f5" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} interval={0} angle={chart.length > 7 ? -35 : 0} textAnchor={chart.length > 7 ? "end" : "middle"} height={chart.length > 7 ? 44 : 24} />
                <YAxis tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, n) => [`${v}x`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Last year (actual)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="This year (planned)" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Why AI and not a fixed rule: a fixed &quot;2x&quot; threshold treats {p.name}&apos;s yearly peak like an anomaly. ClearWay reads your own seasonality and
            campaign signals to set a plan that fits your business.
          </p>
        </Card>
      </div>
    </div>
  );
}
