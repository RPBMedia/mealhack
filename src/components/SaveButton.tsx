"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { saveRecipe, savedRecipeIds, unsaveRecipe } from "@/lib/account-data";
import { SignInSheet } from "@/components/SignInSheet";
import { track } from "@/lib/analytics";
import type { GeneratedRecipe } from "@/lib/schemas";

export function SaveButton({ recipe }: { recipe: GeneratedRecipe }) {
  const { account, accountsAvailable } = useAuth();
  const [saved, setSaved] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!account) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    void savedRecipeIds().then((ids) => {
      if (!cancelled) setSaved(ids.has(recipe.id));
    });
    return () => {
      cancelled = true;
    };
  }, [account, recipe.id]);

  async function toggle() {
    if (!account) {
      setSignIn(true);
      return;
    }
    setBusy(true);
    if (saved) {
      await unsaveRecipe(recipe.id);
      setSaved(false);
    } else {
      const err = await saveRecipe(recipe);
      if (!err) {
        setSaved(true);
        track("recipe_saved", { role: recipe.role });
      }
    }
    setBusy(false);
  }

  // Hide entirely if accounts aren't configured at all.
  if (!accountsAvailable) return null;

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-600 ring-1 transition-colors ${
          saved
            ? "bg-tomato/10 text-tomato ring-tomato/30"
            : "bg-paper text-ink-soft ring-line hover:bg-paper-sunk"
        }`}
      >
        {saved ? "♥ Saved" : "♡ Save"}
      </button>
      <SignInSheet
        open={signIn}
        onClose={() => setSignIn(false)}
        reason="Sign in to save this recipe"
      />
    </>
  );
}
