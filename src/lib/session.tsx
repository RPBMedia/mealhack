"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ConfirmedIngredient } from "@/lib/schemas";

/** Pantry staples the app always assumes (spec §6.5). */
export const DEFAULT_STAPLES = ["salt", "black pepper", "cooking oil", "water"];
export const OPTIONAL_STAPLES = [
  "butter",
  "flour",
  "sugar",
  "garlic",
  "onions",
  "rice",
  "pasta",
  "soy sauce",
  "vinegar",
  "dried herbs",
  "common spices",
];

export interface MealSession {
  confirmed: ConfirmedIngredient[];
  /** Enabled OPTIONAL staples (defaults are always on). */
  staples: string[];
}

const EMPTY: MealSession = { confirmed: [], staples: [] };
const KEY = "mealhack.session";

interface Api {
  session: MealSession;
  setConfirmed(list: ConfirmedIngredient[]): void;
  setStaples(list: string[]): void;
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

  const persist = useCallback((next: MealSession) => {
    setSession(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }, []);

  const setConfirmed = useCallback(
    (list: ConfirmedIngredient[]) =>
      setSession((s) => {
        const next = { ...s, confirmed: list };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [],
  );

  const setStaples = useCallback(
    (list: string[]) =>
      setSession((s) => {
        const next = { ...s, staples: list };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [],
  );

  const reset = useCallback(() => persist(EMPTY), [persist]);

  return (
    <Ctx.Provider value={{ session, setConfirmed, setStaples, reset }}>
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
