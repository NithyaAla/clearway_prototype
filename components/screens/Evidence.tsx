"use client";
import { useRef, useState } from "react";
import { Upload, FileText, ArrowRight, Database, Activity, Megaphone, Trash2 } from "lucide-react";
import { EvidenceItem, postJSON, useDemo } from "../store";
import { Button, Card, CheckRow, cx, ModeBadge, PageHeader, Pill, Spinner } from "../ui";
import type { Check, InvoiceExtraction } from "@/lib/types";
import { inr, num } from "@/lib/format";
import { expectedUnits } from "@/lib/personas";

/** Downscale an image in the browser before sending it: cheaper and faster for the AI call. */
async function toJpegBase64(src: Blob, maxEdge = 1600): Promise<string> {
  const bmp = await createImageBitmap(src);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export default function Evidence() {
  const { s, persona: p, set, go, log } = useDemo();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function analyse(blob: Blob, label: string, previewUrl: string, sampleId?: string) {
    setBusy(label);
    setError(null);
    try {
      const image = await toJpegBase64(blob);
      const r = await postJSON<{ extraction: InvoiceExtraction; checks: Check[] }>("/api/extract-invoice", {
        image,
        mediaType: "image/jpeg",
        sampleId,
        personaId: p.id,
      });
      const item: EvidenceItem = { id: `${Date.now()}`, label, sampleId, previewUrl, mode: r.mode, note: r.note, ...r.data };
      set((prev) => ({ evidence: [item, ...prev.evidence], lastMode: r.mode, needsMoreEvidence: false }));
      const fails = r.data.checks.filter((c) => c.status === "fail").length;
      log("ClearWay agent", `Read ${label}: ${r.data.checks.length - fails} of ${r.data.checks.length} checks passed${fails ? `, ${fails} failed` : ""}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the document");
    } finally {
      setBusy(null);
    }
  }

  async function trySample(id: string, file: string, label: string) {
    const url = `/samples/${file}`;
    const blob = await (await fetch(url)).blob();
    await analyse(blob, label, url, id);
  }

  async function onUpload(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image of the invoice (JPG, PNG or a phone photo).");
      return;
    }
    await analyse(f, f.name, URL.createObjectURL(f));
  }

  const passingInvoice = s.evidence.some((e) => !e.checks.some((c) => c.status === "fail"));
  const parts = [
    { label: "Sale declaration", done: s.declarationConfirmed },
    { label: "Supplier invoice that passes checks", done: passingInvoice },
    { label: "Sales history", done: true },
    { label: "Order-quality signals", done: true },
    { label: "Campaign signals", done: true },
  ];
  const completeness = parts.filter((x) => x.done).length / parts.length;

  return (
    <div>
      <PageHeader
        eyebrow="Step 3 of 7 · Merchant"
        title="Build your evidence pack"
        sub={`Upload a recent supplier ${p.vertical === "Event ticketing" ? "or venue " : ""}invoice. ClearWay reads it, checks it against the GST registry and your plan, and flags anything a reviewer would question.`}
      />

      {s.needsMoreEvidence && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Razorpay&apos;s risk team asked for more evidence. Add a corrected or additional invoice, then resubmit.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onUpload(e.dataTransfer.files?.[0]);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-slate-50/60 px-6 py-8 text-center hover:border-brand-300 hover:bg-brand-50/40"
            >
              <Upload className="text-brand-600" />
              <div className="mt-2 text-sm font-medium text-ink">Drop an invoice image here, or click to upload</div>
              <div className="text-xs text-muted">JPG or PNG, a phone photo works</div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-muted">Or try a sample invoice</div>
              <div className="flex flex-wrap gap-2">
                {p.samples.map((smp) => (
                  <Button key={smp.id} kind="secondary" disabled={!!busy} onClick={() => trySample(smp.id, smp.file, smp.label)}>
                    <FileText size={14} /> {smp.label}
                    <span className={cx("text-xs", smp.flawed ? "text-amber-700" : "text-emerald-700")}>{smp.flawed ? "(has an issue)" : "(clean)"}</span>
                  </Button>
                ))}
              </div>
            </div>
            {busy && (
              <div className="mt-4">
                <Spinner label={`Reading ${busy}…`} />
              </div>
            )}
            {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </Card>

          {s.evidence.map((e) => (
            <InvoiceCard key={e.id} item={e} onRemove={() => set((prev) => ({ evidence: prev.evidence.filter((x) => x.id !== e.id) }))} />
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-ink">Pack completeness</h3>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${completeness * 100}%` }} />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {parts.map((x) => (
                <li key={x.label} className={cx("flex items-center gap-2", x.done ? "text-ink" : "text-muted")}>
                  <span className={cx("h-2 w-2 rounded-full", x.done ? "bg-brand-600" : "bg-slate-300")} /> {x.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">This shows how complete your pack is. It is not a risk score.</p>
            <Button
              className="mt-4 w-full"
              disabled={!passingInvoice}
              onClick={() => {
                log("Merchant", "Finished the evidence pack.");
                go("review");
              }}
            >
              Review what gets shared <ArrowRight size={16} />
            </Button>
            {!passingInvoice && <p className="mt-2 text-xs text-muted">Add an invoice that passes all checks to continue.</p>}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink">Added automatically</h3>
            <p className="mt-1 text-xs text-muted">From data Razorpay already holds. No upload needed.</p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex gap-2.5">
                <Database size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <div className="font-medium text-ink">Sales history</div>
                  <div className="text-muted">13 months, including {p.lastYear.label} at {p.lastYear.peakMultiple}x</div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Activity size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <div className="font-medium text-ink">Order-quality signals</div>
                  <div className="text-muted">From checkout and RTO intelligence (the Thirdwatch lineage)</div>
                  <ul className="mt-1.5 space-y-1">
                    {p.metrics.map((m) => (
                      <li key={m.label} className="flex justify-between gap-3 text-xs">
                        <span className="text-muted">{m.label}</span>
                        <span className={cx("font-medium tabular-nums", m.good ? "text-ink" : "text-amber-700")}>{m.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Megaphone size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <div>
                  <div className="font-medium text-ink">Campaign signals</div>
                  <div className="text-muted">{p.signals.length} signals from connected apps</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InvoiceCard({ item, onRemove }: { item: EvidenceItem; onRemove: () => void }) {
  const { persona: p } = useDemo();
  const x = item.extraction;
  const fails = item.checks.filter((c) => c.status === "fail").length;
  const warns = item.checks.filter((c) => c.status === "warn").length;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{item.label}</h3>
            {fails ? <Pill tone="red">{fails} issue{fails > 1 ? "s" : ""} to fix</Pill> : warns ? <Pill tone="amber">Check warnings</Pill> : <Pill tone="green">All checks passed</Pill>}
          </div>
          {item.note && <div className="mt-1 text-xs text-muted">{item.note}</div>}
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge mode={item.mode} note={item.note} />
          <button onClick={onRemove} className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Remove">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.label} className="w-full rounded-lg border border-line md:col-span-2" />
        <div className="md:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">What the AI read</div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Row k="Supplier" v={x.supplier_name} />
            <Row k="Supplier GSTIN" v={x.supplier_gstin} mono />
            <Row k="Billed to" v={x.buyer_name} />
            <Row k="Invoice" v={[x.invoice_number, x.invoice_date].filter(Boolean).join(" · ")} />
            <Row k={p.vertical === "Event ticketing" ? "Capacity" : "Units supplied"} v={x.capacity_or_units ? num(x.capacity_or_units) : null} />
            <Row k="Invoice total" v={x.total_amount ? inr(x.total_amount) : null} />
          </dl>
          {x.line_items?.length > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-muted">
              {x.line_items.map((l, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="truncate">{l.description}</span>
                  <span className="tabular-nums">{l.quantity ? num(l.quantity) : ""}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Checks</div>
          <div className="divide-y divide-line">
            {item.checks.map((c) => (
              <CheckRow key={c.id} {...c} />
            ))}
          </div>
          <div className="mt-2 text-xs text-muted">Expected volume used for coverage: about {num(expectedUnits(p))} {p.unitLabel}.</div>
        </div>
      </div>
    </Card>
  );
}

function Row({ k, v, mono }: { k: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={cx("font-medium text-ink", mono && "font-mono text-[13px]")}>{v || <span className="text-muted">Not found</span>}</dd>
    </div>
  );
}
