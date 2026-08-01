import { NextResponse } from "next/server";
import { getProvider } from "@/ai/provider";

/** POST /api/analyze — multipart form with one or more `images`. Returns the
 * validated detected-ingredient list. AI stays server-side (spec §11). */
export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const imageCount = form ? form.getAll("images").length : 0;
    if (imageCount < 1) {
      return NextResponse.json(
        { error: "Add at least one photo to scan." },
        { status: 400 },
      );
    }
    const result = await getProvider().analyzeIngredients({ imageCount });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "We couldn't analyse those photos. Please try again." },
      { status: 500 },
    );
  }
}
