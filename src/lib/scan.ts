import Anthropic from "@anthropic-ai/sdk";
import { ScanResult } from "./types";

export const SCAN_MODE: "live" | "mock" = process.env.ANTHROPIC_API_KEY ? "live" : "mock";

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-5";

const SYSTEM = `You read a photo of a retail or pharmacy product package and extract inventory data.
Return ONLY the product's own printed information. Read the expiry / "best before" / "use by" / "EXP" date and normalise it to ISO YYYY-MM-DD.
If a day is missing (e.g. "EXP 07/2026"), use the last day of that month.
For pharmacy stock also read the batch / lot number ("LOT", "B.No", "Batch").
Never guess a date you cannot read — leave it "" and lower the confidence.`;

const TOOL: Anthropic.Tool = {
  name: "record_item",
  description: "Record the product details read from the package photo.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Product name incl. strength/size if shown, e.g. 'Amoxicillin 500mg'" },
      category: { type: "string", description: "Best-fit category, e.g. Medication, Supplement, Dairy, Produce, Beverage" },
      expiryDate: { type: "string", description: "ISO YYYY-MM-DD, or empty string if unreadable" },
      quantity: { type: "number", description: "Units visible, default 1 if unclear" },
      batchLot: { type: "string", description: "Batch/lot number, or empty string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      note: { type: "string", description: "Short note on anything ambiguous, else empty" }
    },
    required: ["name", "category", "expiryDate", "quantity", "batchLot", "confidence"]
  }
};

// Deterministic sample so the scan flow is fully demoable with no API key.
function mockScan(): ScanResult {
  const d = new Date();
  d.setDate(d.getDate() + 20);
  return {
    name: "Ibuprofen 400mg (24 tabs)",
    category: "Medication",
    expiryDate: d.toISOString().slice(0, 10),
    quantity: 3,
    batchLot: "IBU7731",
    confidence: "medium",
    note: "Sample result — set ANTHROPIC_API_KEY for real scanning."
  };
}

export async function scanImage(base64: string, mediaType: string): Promise<ScanResult> {
  if (SCAN_MODE === "mock") return mockScan();

  const client = new Anthropic();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_item" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 } },
          { type: "text", text: "Extract this product's inventory details." }
        ]
      }
    ]
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Could not read the product from that image — try a clearer photo of the label.");
  }
  const r = block.input as Partial<ScanResult>;
  return {
    name: r.name || "Unknown product",
    category: r.category || "Uncategorised",
    expiryDate: r.expiryDate || "",
    quantity: typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1,
    batchLot: r.batchLot || "",
    confidence: r.confidence || "low",
    note: r.note || undefined
  };
}
