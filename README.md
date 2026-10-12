# ClearWay: sale pre-clearance prototype

A clickable prototype of ClearWay, an AI agent that helps merchants pre-clear a planned sales spike with their payment provider's risk team, so settlements keep flowing during the sale. Built for the Razorpay AI Challenge ("Recover and Grow with AI"). All merchants, numbers and documents are simulated.

## Run it locally

You need Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key into .env.local
npm run dev
```

Open http://localhost:3000.

Without a key, or with `DEMO_MODE=true`, every AI step replays a saved example, so the demo still works end to end.

## Deploy

Push to GitHub, import the repo in Vercel, and add `ANTHROPIC_API_KEY` as an environment variable. See the setup guide for step-by-step instructions.

## Where things live

| What | File |
| --- | --- |
| Merchant personas and their numbers | `lib/personas.ts` |
| Synthetic sales history | `lib/history.ts` |
| Live-sale simulation and the "without ClearWay" counterfactual | `lib/simulate.ts` |
| Invoice checks (GSTIN, registry, coverage) | `lib/checks.ts` |
| Saved AI outputs for demo mode | `lib/demo.ts` |
| Claude client and model names | `lib/claude.ts` |
| AI routes (server only, the key never reaches the browser) | `app/api/*/route.ts` |
| Screens | `components/screens/*.tsx` |
| Colours and fonts | `app/globals.css` |
| Sample invoices | `public/samples/` (regenerate with `scripts/make_invoices.py`) |

## The four AI calls

| Route | Model | What it does |
| --- | --- | --- |
| `/api/draft-declaration` | Claude Sonnet 5.5 | Drafts the sale plan from history and campaign signals |
| `/api/extract-invoice` | Claude Sonnet 5.5 (vision) | Reads a supplier invoice image into structured fields |
| `/api/reviewer-summary` | Claude Sonnet 5.5 | Writes the risk analyst's brief and suggests an envelope |
| `/api/nudge` | Claude Haiku 5.5 | Writes the merchant message when the sale leaves its envelope |

The AI reads and writes; plain code checks. GSTIN validation, registry lookup and stock coverage are deterministic rules in `lib/checks.ts`, so every pass or fail can be audited.
