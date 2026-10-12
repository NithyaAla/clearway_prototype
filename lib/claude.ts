// Server-only helper for calling Claude. Never import this from a client component:
// the API key must stay on the server.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Change these if you want to try other models. See the Anthropic pricing page.
export const MODELS = {
  smart: "claude-sonnet-5-5", // invoice reading, drafting, reviewer summary
  fast: "claude-haiku-5-5", // short merchant nudges
};

export function liveAIEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.DEMO_MODE !== "true";
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    // Keys that aren't scoped to one workspace must say which workspace each request uses.
    // Find the ID under Settings > Workspaces in the Claude Console (it starts with wrkspc_).
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: workspace ? { "anthropic-workspace-id": workspace } : undefined,
    });
  }
  return client;
}

type Block =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } };

/** Ask Claude for a JSON object and parse it. Throws if the reply isn't valid JSON. */
export async function askJSON<T>(opts: { model: string; system: string; content: Block[]; maxTokens?: number }): Promise<T> {
  const res = await getClient().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 3000,
    // Thinking counts toward max_tokens. These are short, structured tasks, so low effort
    // keeps Claude from spending the whole budget reasoning before it writes the answer.
    output_config: { effort: "low" },
    system: opts.system + "\n\nRespond with a single JSON object only. No markdown fences, no commentary.",
    messages: [{ role: "user", content: opts.content }],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (res.stop_reason === "max_tokens") throw new Error("Reply was cut off before it finished. Raise maxTokens for this route.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export function errorNote(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return `Live AI call failed, showing a saved example instead (${msg.slice(0, 140)})`;
}
