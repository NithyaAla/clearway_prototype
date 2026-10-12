"use client";
import { useDemo } from "../store";
import { Card, cx } from "../ui";

const ACTOR_COLORS: Record<string, string> = {
  Merchant: "bg-sky-500",
  "ClearWay agent": "bg-brand-600",
  "Risk maker": "bg-violet-500",
  "Risk checker": "bg-violet-700",
  System: "bg-slate-400",
};

export function AuditLog() {
  const { s } = useDemo();
  return (
    <Card className="h-fit">
      <h3 className="text-sm font-semibold text-ink">Audit log</h3>
      <p className="mt-1 text-xs text-muted">Every agent and human action, newest first.</p>
      <ol className="mt-3 max-h-[480px] space-y-3 overflow-y-auto pr-1">
        {s.audit.length === 0 && <li className="text-sm text-muted">No actions yet.</li>}
        {s.audit.map((a, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", ACTOR_COLORS[a.actor])} />
            <div>
              <div className="text-xs text-muted">
                {a.time} · <span className="font-medium text-ink">{a.actor}</span>
              </div>
              <div className="text-ink">{a.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
