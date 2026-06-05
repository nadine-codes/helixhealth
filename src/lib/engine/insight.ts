import Anthropic from "@anthropic-ai/sdk";
import type { EvidencePacket, Insight } from "@/lib/types";
import { DISCLAIMER } from "@/lib/types";
import {
  EMIT_INSIGHT_TOOL,
  REASONING_MODEL,
  buildSystemBlocks,
} from "./system-prompt";
import { insightSchema } from "./validate";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

function extractToolInput(msg: Anthropic.Messages.Message): unknown | null {
  for (const block of msg.content) {
    if (block.type === "tool_use" && block.name === "emit_insight") {
      return block.input;
    }
  }
  return null;
}

// Run the reasoning engine: forced emit_insight tool call, validate, retry once.
export async function runInsight(packet: EvidencePacket): Promise<Insight> {
  const system = buildSystemBlocks();
  const userText = `Here is the user's question and their structured health evidence packet. Reason over it and call emit_insight.

${JSON.stringify(packet, null, 2)}`;

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userText },
  ];

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client().messages.create({
      model: REASONING_MODEL,
      max_tokens: 4096,
      system,
      tools: [EMIT_INSIGHT_TOOL],
      tool_choice: { type: "tool", name: "emit_insight" },
      messages,
    });

    const raw = extractToolInput(msg);
    const parsed = insightSchema.safeParse(raw);
    if (parsed.success) {
      const data = parsed.data;
      return {
        ...data,
        disclaimer: DISCLAIMER,
        secondary_chains: data.secondary_chains ?? [],
      } as Insight;
    }

    lastErr = parsed.error;
    // Feed the validation error back for a single retry.
    messages.push({
      role: "assistant",
      content: msg.content,
    });
    messages.push({
      role: "user",
      content: `The emit_insight payload failed schema validation:\n${JSON.stringify(
        parsed.error.issues,
        null,
        0
      )}\nCall emit_insight again with a corrected payload that satisfies the schema exactly.`,
    });
  }

  throw new Error(
    `emit_insight failed schema validation after retry: ${String(lastErr)}`
  );
}
