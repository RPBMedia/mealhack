import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/ai/provider";
import { Preferences } from "@/lib/schemas";
import { validateRecipeSet } from "@/lib/validate-recipes";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Generating (and possibly repairing) three recipes can take a while.
export const maxDuration = 60;

const Body = z.object({
  available: z.array(z.object({ name: z.string(), useFirst: z.boolean() })).min(1),
  staples: z.array(z.string()),
  preferences: Preferences,
});

/** POST /api/recipes/generate — returns exactly three validated recipes. AI
 * stays server-side; output is validated (and repaired once) before it ever
 * reaches the client (spec §6.8, §11). */
export async function POST(req: Request) {
  if (!rateLimit(`generate:${clientIp(req)}`, 40, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment." },
      { status: 429 },
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add at least one ingredient before generating recipes." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const provider = getProvider();
  const genInput = {
    available: input.available,
    staples: input.staples,
    prefs: input.preferences,
  };

  try {
    let result = await provider.generateRecipes(genInput);
    let check = validateRecipeSet(result.recipes, input.preferences);

    // One repair attempt (spec §6.8) — for the mock this is a regenerate.
    if (!check.ok) {
      result = await provider.generateRecipes(genInput);
      check = validateRecipeSet(result.recipes, input.preferences);
    }

    if (!check.ok) {
      const debug = new URL(req.url).searchParams.get("debug") === "1";
      return NextResponse.json(
        {
          error:
            "We couldn't put together three solid recipes from that. Try adjusting your ingredients or constraints.",
          ...(debug ? { detail: check.errors } : {}),
        },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    const debug = new URL(req.url).searchParams.get("debug") === "1";
    return NextResponse.json(
      {
        error: "Recipe generation failed. Please try again.",
        ...(debug ? { detail: e instanceof Error ? e.message : String(e) } : {}),
      },
      { status: 500 },
    );
  }
}
