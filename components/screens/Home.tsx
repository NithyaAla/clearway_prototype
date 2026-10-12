"use client";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Radar, ShieldCheck, ArrowRight } from "lucide-react";
import { useDemo } from "../store";
import { Button, Card, PageHeader, Pill, Stat } from "../ui";
import { generateHistory } from "@/lib/history";
import { addDays, inr, longDate, shortDate } from "@/lib/format";
import { expectedSaleGmv } from "@/lib/personas";

export default function Home() {
  const { persona: p, go, log } = useDemo();
  const history = useMemo(() => generateHistory(p), [p]);
  const last30 = history.slice(-30).reduce((a, d) => a + d.gmv, 0);
  const lyEnd = addDays(p.lastYear.start, p.lastYear.days - 1);
  const weekly = useMemo(() => {
    // weekly totals keep the chart readable
    const out: { week: string; gmv: number }[] = [];
    for (let i = 0; i < history.length; i += 7) {
      const chunk = history.slice(i, i + 7);
      out.push({ week: chunk[0].date, gmv: chunk.reduce((a, d) => a + d.gmv, 0) });
    }
    return out;
  }, [history]);
  const weekOf = (iso: string) => [...weekly].reverse().find((w) => w.week <= iso)?.week ?? weekly[0]?.week;

  return (
    <div>
      <PageHeader
        eyebrow={`${p.vertical} · ${p.city}`}
        title={`Good afternoon, ${p.name}`}
        sub="Your payments dashboard, with ClearWay running in the background."
        right={<Pill tone="green">Settlements on schedule</Pill>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today's collections" value={inr(p.baselineDailyGmv * 0.62, { compact: true })} sub="Until 2 pm" />
        <Stat label="Next settlement" value={inr(p.baselineDailyGmv * 0.98, { compact: true })} sub="Tomorrow, 10:00 am" />
        <Stat label="Last 30 days" value={inr(last30, { compact: true })} sub={`Average order ${inr(p.aov)}`} />
        <Stat label="Account status" value="Active" sub="No open risk reviews" tone="good" />
      </div>

      <Card accent className="mt-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Radar size={16} /> ClearWay spotted a sale coming up
            </div>
            <h2 className="mt-2 text-xl font-semibold text-ink">
              {p.sale.name}, {shortDate(p.sale.start)} to {longDate(p.sale.end)}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-ink">
              {p.signals.map((sig) => (
                <li key={sig} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" /> {sig}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Sudden spikes well above your normal volume can trigger a risk review that holds settlements mid-sale. Pre-clear this sale now and
              about {inr(expectedSaleGmv(p), { compact: true })} in expected sales keeps settling on schedule. It takes about 10 minutes.
            </p>
            <p className="mt-2 text-xs text-muted">Signals come from your connected store, ad and listing apps (simulated).</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 md:w-56">
            <Button
              onClick={() => {
                log("ClearWay agent", `Suggested pre-clearing ${p.sale.name} based on ${p.signals.length} campaign signals.`);
                go("declare");
              }}
            >
              Pre-clear this sale <ArrowRight size={16} />
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <ShieldCheck size={14} className="text-brand-600" /> Nothing is shared until you approve it.
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">Weekly collections, last 13 months</h3>
          <span className="text-xs text-muted">
            Shaded: {p.lastYear.label}, peaked at {p.lastYear.peakMultiple}x normal
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="week" tickFormatter={shortDate} minTickGap={40} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => inr(v, { compact: true })} width={64} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [inr(Number(v)), "Week's collections"]} labelFormatter={(l) => `Week of ${longDate(String(l))}`} />
              <ReferenceArea x1={weekOf(addDays(p.lastYear.start, -7))} x2={weekOf(lyEnd)} fill="#fde68a" fillOpacity={0.35} ifOverflow="extendDomain" />
              <Area type="monotone" dataKey="gmv" stroke="#059669" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
