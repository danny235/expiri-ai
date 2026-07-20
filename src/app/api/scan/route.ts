import { NextResponse } from "next/server";
import { scanImage, SCAN_MODE } from "@/lib/scan";

export const maxDuration = 30;

// Accepts a base64 data URL (or raw base64 + mediaType) and returns the
// extracted product fields for the user to confirm before saving.
export async function POST(request: Request) {
  try {
    const { image, mediaType } = (await request.json()) as { image?: string; mediaType?: string };
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    let base64 = image;
    let type = mediaType || "image/jpeg";
    const m = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (m) {
      type = m[1];
      base64 = m[2];
    }

    const result = await scanImage(base64, type);
    return NextResponse.json({ result, mode: SCAN_MODE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
