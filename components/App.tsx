"use client";
import { DemoProvider, STEPS, stepDone, useDemo } from "./store";
import { PERSONA_LIST, PersonaId } from "@/lib/personas";
import { cx, ModeBadge, Pill } from "./ui";
import { Check, RotateCcw } from "lucide-react";
import Home from "./screens/Home";
import Declare from "./screens/Declare";
import Evidence from "./screens/Evidence";
import Review from "./screens/Review";
import Reviewer from "./screens/Reviewer";
import Live from "./screens/Live";
import Outcome from "./screens/Outcome";

export default function App() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0ac2fa" />
        <path d="M9 24 C 12 16, 14 12, 23 8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M13 25 C 16 18, 18 15, 25 12" stroke="#fbfbfb" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <div>
        <div className="text-[25px] font-semibold leading-tight text-white">ClearWay</div>
        <div className="text-[15px] leading-tight text-slate-400">Sale Pre-Clearance Agent</div>
      </div>
    </div>
  );
}

function Shell() {
  const { s, go, reset } = useDemo();
  const groups = ["Merchant", "Razorpay risk", "Results"] as const;
  const Screen = { home: Home, declare: Declare, evidence: Evidence, review: Review, reviewer: Reviewer, live: Live, outcome: Outcome }[s.step];

  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-navy text-slate-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
          <Logo />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-5 lg:px-3 lg:pb-6">
          {groups.map((g) => (
            <div key={g} className="flex gap-1 lg:block lg:space-y-0.5">
              <div className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:block">{g}</div>
              {STEPS.filter((st) => st.who === g).map((st) => {
                const n = STEPS.findIndex((x) => x.id === st.id) + 1;
                const active = s.step === st.id;
                const done = stepDone(s, st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => go(st.id)}
                    className={cx(
                      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition lg:w-full",
                      active ? "bg-navy-2 text-white" : "text-slate-300 hover:bg-navy-2/60 hover:text-white",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        done ? "bg-brand-500 text-white" : active ? "bg-white text-navy" : "bg-slate-700 text-slate-300",
                      )}
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : n}
                    </span>
                    {st.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="hidden px-6 pb-6 text-[15px] leading-relaxed text-slate-500 lg:block">
          Concept prototype for the Razorpay AI Challenge. All merchants, numbers and documents are simulated. This is NOT a Razorpay product.
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white/90 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Merchant</span>
            <select
              value={s.personaId}
              onChange={(e) => reset(e.target.value as PersonaId)}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-brand-500"
            >
              {PERSONA_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.vertical}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            {s.lastMode ? <ModeBadge mode={s.lastMode} /> : <Pill tone="slate">AI ready</Pill>}
            <button onClick={() => reset()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-slate-100 hover:text-ink">
              <RotateCcw size={14} /> Restart demo
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Screen />
        </main>
      </div>
    </div>
  );
}
