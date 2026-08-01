"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

export function SignInSheet({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const { signInWithGoogle, signInWithEmail, accountsAvailable } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open || typeof document === "undefined") return null;

  async function google() {
    setBusy(true);
    setErr(await signInWithGoogle());
    setBusy(false);
  }
  async function magic() {
    if (!email.trim()) return;
    setBusy(true);
    const e = await signInWithEmail(email.trim());
    setBusy(false);
    if (e) setErr(e);
    else setSent(true);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-paper p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
          {reason ?? "Sign in to Mealhack"}
        </h2>

        {!accountsAvailable ? (
          <p className="mt-3 text-ink-soft">
            Accounts are coming soon. For now you can cook without one — your
            current recipe is right here.
          </p>
        ) : sent ? (
          <p className="mt-3 text-ink-soft">
            Check your email — we sent a magic link to{" "}
            <span className="text-ink">{email}</span>. Open it on this device to
            finish signing in.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              Save recipes and keep your preferences across devices.
            </p>
            <Button
              className="mt-5 w-full"
              variant="soft"
              disabled={busy}
              onClick={google}
            >
              Continue with Google
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" /> or{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              className="min-h-12 w-full rounded-full bg-salt px-4 text-ink ring-1 ring-line outline-none placeholder:text-ink-faint"
            />
            <Button className="mt-3 w-full" disabled={busy || !email.trim()} onClick={magic}>
              Email me a magic link
            </Button>
            {err && <p className="mt-3 text-sm font-600 text-tomato">{err}</p>}
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 block w-full text-center text-sm font-600 text-ink-soft hover:text-ink"
        >
          {accountsAvailable && !sent ? "Not now" : "Close"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
