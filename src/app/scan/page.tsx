"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Container, Logo } from "@/components/ui";
import { useMealSession } from "@/lib/session";
import { AnalyzeResponse, type ConfirmedIngredient } from "@/lib/schemas";
import { MAX_FILE_MB, MAX_IMAGES, prepareImage, type PreparedImage } from "@/lib/image";
import { track } from "@/lib/analytics";

export default function ScanPage() {
  const router = useRouter();
  const { setConfirmed } = useMealSession();
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("scan_started");
    return () => images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const room = MAX_IMAGES - images.length;
      const chosen = Array.from(files).slice(0, Math.max(0, room));
      const prepared: PreparedImage[] = [];
      for (const f of chosen) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`Each photo must be under ${MAX_FILE_MB} MB.`);
          continue;
        }
        try {
          prepared.push(await prepareImage(f));
          track("photo_added");
        } catch {
          setError("That image format isn't supported. Try a JPEG or PNG.");
        }
      }
      if (prepared.length) setImages((prev) => [...prev, ...prepared]);
      if (files.length > room && room >= 0) {
        setError(`You can add up to ${MAX_IMAGES} photos.`);
      }
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function analyze() {
    if (images.length === 0) return;
    setError(null);
    setAnalyzing(true);
    track("scan_submitted", { images: images.length });
    try {
      const form = new FormData();
      images.forEach((img, i) => form.append("images", img.blob, `photo-${i}.jpg`));
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Analysis failed.");
      const parsed = AnalyzeResponse.parse(json);
      const confirmed: ConfirmedIngredient[] = parsed.ingredients.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        state: d.state ?? "unknown",
        useFirst: false,
        available: true,
        source: "detected",
        confidence: d.confidence,
      }));
      setConfirmed(confirmed);
      track("ingredients_detected", { count: confirmed.length });
      router.push("/scan/confirm");
    } catch (e) {
      setAnalyzing(false);
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong analysing your photos.",
      );
    }
  }

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

      <main className="flex-1 pb-32">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Scan your ingredients
          </h1>
          <p className="mt-1 text-ink-soft">
            Snap your fridge, counter or pantry. A few photos is plenty — good
            light and spread-out items help.
          </p>

          {/* hidden inputs */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              variant="soft"
              disabled={busy || images.length >= MAX_IMAGES}
              onClick={() => cameraRef.current?.click()}
            >
              📷 Take photo
            </Button>
            <Button
              variant="soft"
              disabled={busy || images.length >= MAX_IMAGES}
              onClick={() => libraryRef.current?.click()}
            >
              🖼️ Upload
            </Button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-tomato/10 px-4 py-3 text-sm font-600 text-tomato"
            >
              {error}
            </p>
          )}

          {/* previews */}
          {images.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-ink-soft">
                <span>
                  {images.length} photo{images.length > 1 ? "s" : ""} ·{" "}
                  {MAX_IMAGES - images.length} left
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div
                    key={img.previewUrl}
                    className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt={`Ingredient photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-sm text-white backdrop-blur"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid place-items-center rounded-2xl border-2 border-dashed border-line py-14 text-center">
              <div className="text-4xl">🥕</div>
              <p className="mt-2 max-w-xs text-sm text-ink-soft">
                No photos yet. Take or upload a photo of your ingredients to get
                started.
              </p>
            </div>
          )}
        </Container>
      </main>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-salt/90 backdrop-blur">
        <Container className="py-4">
          <Button
            className="w-full"
            disabled={images.length === 0 || analyzing || busy}
            onClick={analyze}
          >
            {analyzing ? "Analysing…" : `Analyse ${images.length || ""} photo${images.length === 1 ? "" : "s"}`.trim()}
          </Button>
        </Container>
      </div>

      {/* scanning overlay */}
      {analyzing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-salt/95 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-basil/30 border-t-basil" />
            <p className="mt-4 font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
              Spotting your ingredients…
            </p>
            <p className="mt-1 text-sm text-ink-soft">This takes a few seconds.</p>
          </div>
        </div>
      )}
    </>
  );
}
