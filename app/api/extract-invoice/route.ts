// Reads an uploaded supplier invoice with Claude's vision, then runs deterministic checks.
import { askJSON, errorNote, liveAIEnabled, MODELS } from "@/lib/claude";
import { runInvoiceChecks } from "@/lib/checks";
import { demoExtraction } from "@/lib/demo";
import { PERSONAS, PersonaId } from "@/lib/personas";
import { rateLimited } from "@/lib/rate-limit";
import type { AIMode, InvoiceExtraction } from "@/lib/types";

const SYSTEM = `You read Indian GST tax invoices for a payment company's risk team.
Extract these fields exactly as printed:
{
  "supplier_name": string|null,
  "supplier_gstin": string|null,      // 15 characters, copy exactly; null if any character is unclear
  "buyer_name": string|null,          // the "Bill to" party
  "buyer_gstin": string|null,
  "invoice_number": string|null,
  "invoice_date": "YYYY-MM-DD"|null,  // Indian invoices usually print DD-MM-YYYY
  "line_items": [{"description": string, "quantity": number, "unit_price": number, "amount": number}],
  "capacity_or_units": number|null,   // total units of goods supplied; for a venue invoice, the venue capacity
  "taxable_value": number|null,
  "gst_amount": number|null,          // total of CGST+SGST or IGST
  "total_amount": number|null,
  "confidence": "high"|"medium"|"low",
  "notes": string|null                // anything unreadable, altered or suspicious
}
Numbers are plain numbers in rupees (no commas, no currency symbols). Never guess a character you cannot read.`;

const MAX_BASE64 = 7_000_000; // about 5 MB of image

export async function POST(req: Request) {
  const body = (await req.json()) as { image?: string; mediaType?: string; sampleId?: string; personaId: PersonaId };
  const persona = PERSONAS[body.personaId];
  if (!persona) return Response.json({ error: "Unknown merchant" }, { status: 400 });

  let extraction: InvoiceExtraction;
  let mode: AIMode = "demo";
  let note: string | undefined;

  if (!liveAIEnabled()) {
    extraction = demoExtraction(body.sampleId);
    note = "Demo mode: showing a saved reading of this sample.";
  } else if (rateLimited(req)) {
    extraction = demoExtraction(body.sampleId);
    note = "Too many requests from this device, showing a saved example.";
  } else if (!body.image || body.image.length > MAX_BASE64) {
    return Response.json({ error: "Image missing or too large (max about 5 MB)." }, { status: 400 });
  } else {
    try {
      extraction = await askJSON<InvoiceExtraction>({
        model: MODELS.smart,
        system: SYSTEM,
        maxTokens: 1500,
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: (body.mediaType as "image/jpeg") ?? "image/jpeg", data: body.image },
          },
          { type: "text", text: "Extract the invoice fields as JSON." },
        ],
      });
      extraction.line_items ??= [];
      mode = "live";
    } catch (e) {
      extraction = demoExtraction(body.sampleId);
      note = errorNote(e);
    }
  }

  const checks = runInvoiceChecks(extraction, persona);
  return Response.json({ mode, note, data: { extraction, checks } });
}
