"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { SignInSheet } from "@/components/SignInSheet";

/** Account access for page headers. Renders nothing when accounts aren't
 * configured (fully anonymous build). */
export function AccountNav() {
  const { account, accountsAvailable } = useAuth();
  const [signIn, setSignIn] = useState(false);
  if (!accountsAvailable) return null;

  return (
    <div className="flex items-center gap-3 text-sm font-600">
      <Link href="/saved" className="text-ink-soft hover:text-ink">
        Saved
      </Link>
      {account ? (
        <Link
          href="/account"
          className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-basil-tint text-basil-strong"
          aria-label="Account"
        >
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            account.name.charAt(0).toUpperCase()
          )}
        </Link>
      ) : (
        <button
          onClick={() => setSignIn(true)}
          className="rounded-full bg-basil px-4 py-2 text-white"
        >
          Sign in
        </button>
      )}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </div>
  );
}
