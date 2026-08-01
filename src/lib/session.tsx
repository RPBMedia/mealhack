"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  ConfirmedIngredient,
  GeneratedRecipe,
  Preferences,
} from "@/lib/schemas";

export { DEFAULT_STAPLES, OPTIONAL_STAPLES } from "@/lib/staples";

export interface MealSession {
  confirmed: ConfirmedIngredient[];
  /** Enabled OPTIONAL staples (defaults are always on). */
  staples: string[];
  preferences: Preferences | null;
  recipes: GeneratedRecipe[];
}

const EMPTY: MealSession = {
  confirmed: [],
  staples: [],
  preferences: null,
  recipes: [],
};
const KEY = "mealhack.session";

interface Api {
  session: MealSession;
  update(patch: Partial<MealSession>): void;
  setConfirmed(list: ConfirmedIngredient[]): void;
  setStaples(list: string[]): void;
  setPreferences(p: Preferences): void;
  setRecipes(r: GeneratedRecipe[]): void;
  reset(): void;
}

const Ctx = createContext<Api | null>(null);

export function MealSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MealSession>(EMPTY);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSession({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((patch: Partial<MealSession>) => {
    setSession((s) => {
      const next = { ...s, ...patch };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const setConfirmed = useCallback((list: ConfirmedIngredient[]) => update({ confirmed: list }), [update]);
  const setStaples = useCallback((list: string[]) => update({ staples: list }), [update]);
  const setPreferences = useCallback((p: Preferences) => update({ preferences: p }), [update]);
  const setRecipes = useCallback((r: GeneratedRecipe[]) => update({ recipes: r }), [update]);
  const reset = useCallback(() => update(EMPTY), [update]);

  return (
    <Ctx.Provider
      value={{ session, update, setConfirmed, setStaples, setPreferences, setRecipes, reset }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMealSession(): Api {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useMealSession must be used within MealSessionProvider");
  return ctx;
}
