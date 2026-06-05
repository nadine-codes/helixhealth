import Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_MODEL } from "./system-prompt";

export interface ExtractedBiomarker {
  name: string;
  key: string | null;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: "low" | "high" | "in_range";
}

const EXTRACT_TOOL: Anthropic.Messages.Tool = {
  name: "extract_biomarkers",
  description: "Extract all lab biomarkers from a bloodwork report.",
  input_schema: {
    type: "object",
    required: ["biomarkers"],
    properties: {
      biomarkers: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value", "unit", "flag"],
          properties: {
            name: { type: "string" },
            key: {
              type: ["string", "null"],
              description:
                "snake_case canonical key if recognized: ferritin, vitamin_d, tsh, hs_crp, fasting_glucose, vitamin_b12, hemoglobin; else null",
            },
            value: { type: "number" },
            unit: { type: "string" },
            reference_low: { type: ["number", "null"] },
            reference_high: { type: ["number", "null"] },
            flag: { enum: ["low", "high", "in_range"] },
          },
        },
      },
    },
  } as unknown as Anthropic.Messages.Tool.InputSchema,
};

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export async function extractBiomarkers(
  pdfBase64: string
): Promise<ExtractedBiomarker[]> {
  const msg = await client().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1500,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_biomarkers" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extract every biomarker in this lab report with its value, unit, reference range, and whether it is low/high/in_range. Map recognized markers to their canonical snake_case key.",
          },
        ],
      },
    ],
  });

  for (const block of msg.content) {
    if (block.type === "tool_use" && block.name === "extract_biomarkers") {
      const input = block.input as { biomarkers: ExtractedBiomarker[] };
      return input.biomarkers ?? [];
    }
  }
  return [];
}
