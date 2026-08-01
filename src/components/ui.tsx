import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "soft" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-basil text-white hover:bg-basil-strong shadow-sm active:translate-y-px",
  soft: "bg-paper text-ink ring-1 ring-line hover:bg-paper-sunk",
  ghost: "text-ink hover:bg-paper-sunk",
};

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-600 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: { variant?: Variant } & ComponentProps<"button">) {
  return <button className={`${base} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: { variant?: Variant } & ComponentProps<typeof Link>) {
  return (
    <Link className={`${base} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-md px-5 sm:max-w-2xl ${className}`}>
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-paper ring-1 ring-line shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-700 uppercase tracking-[0.18em] text-basil">
      {children}
    </p>
  );
}

/** Mealhack wordmark. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--font-fraunces)] font-700 tracking-tight ${className}`}
    >
      Meal<span className="text-basil">hack</span>
    </span>
  );
}
