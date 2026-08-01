import Link from "next/link";
import { Container, Logo } from "@/components/ui";

export default function ScanPage() {
  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/" className="text-sm font-600 text-ink-soft hover:text-ink">
            Cancel
          </Link>
        </Container>
      </header>

      <main className="flex flex-1 items-center justify-center py-16">
        <Container className="text-center">
          <div className="text-4xl">📷</div>
          <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Scan your ingredients
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            Camera and photo upload are coming together here next — this is the
            start of the scan flow.
          </p>
        </Container>
      </main>
    </>
  );
}
