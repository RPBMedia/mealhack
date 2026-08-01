import { NextResponse } from "next/server";
import { getProvider } from "@/ai/provider";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Vision on several photos can take a while — allow up to 60s (spec §16).
export const maxDuration = 60;

const MAX_IMAGES = 5;
const MAX_BYTES = 8 * 1024 * 1024; // per image, after client compression

/** POST /api/analyze — multipart form with one or more `images`. Returns the
 * validated detected-ingredient list. AI stays server-side (spec §11). */
export async function POST(req: Request) {
  if (!rateLimit(`analyze:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "You're scanning very quickly — please wait a moment." },
      { status: 429 },
    );
  }

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("images") ?? []).filter(
    (f): f is File => f instanceof File,
  );
  if (files.length < 1) {
    return NextResponse.json(
      { error: "Add at least one photo to scan." },
      { status: 400 },
    );
  }
  if (files.length > MAX_IMAGES || files.some((f) => f.size > MAX_BYTES)) {
    return NextResponse.json(
      { error: "Please use up to 5 photos and keep each one small." },
      { status: 413 },
    );
  }

  try {
    const images = await Promise.all(
      files.map(async (f) => ({
        data: Buffer.from(await f.arrayBuffer()).toString("base64"),
        mediaType: f.type || "image/jpeg",
      })),
    );
    const result = await getProvider().analyzeIngredients({ images });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    const hint =
      msg.includes("dimension") || msg.includes("2000") || msg.includes("size")
        ? "Those photos may be too large — try fewer photos or move a bit further back."
        : "We couldn't analyse those photos. Please try again with brighter, spread-out photos.";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
