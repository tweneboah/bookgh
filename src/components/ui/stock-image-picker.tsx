"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Input } from "@/components/ui";

type StockImage = {
  id: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourcePage: string;
  thumb: string;
  full: string;
};

export function StockImagePicker({
  open,
  onClose,
  onPick,
  initialQuery = "",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (img: { url: string; caption?: string }) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StockImage[]>([]);
  const [selected, setSelected] = useState<StockImage | null>(null);

  const defaultQuery = (initialQuery ?? "").trim() || "food";

  useEffect(() => {
    if (!open) return;
    setError(null);
    setResults([]);
    setPage(1);
    setQuery((initialQuery ?? "").trim());
    setSelected(null);

    // Auto-load sample images by default
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    setTimeout(() => {
      void (async () => {
        const q = ((initialQuery ?? "").trim() || "food").trim();
        if (!q) return;
        // run first-page search
        await searchInternal({ q, nextPage: 1 });
      })();
    }, 0);
  }, [open, initialQuery]);

  const searchInternal = async (opts: { q: string; nextPage: number }) => {
    const q = opts.q.trim();
    if (!q) {
      setError("Type a search term (e.g. rice, beef, vegetables).");
      return;
    }
    const nextPage = opts.nextPage;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/media/stock-images", window.location.origin);
      url.searchParams.set("q", q);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("perPage", "18");
      const res = await fetch(url.toString());
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? "Search failed");
      }
      const list = (payload?.data?.results ?? []) as StockImage[];
      setResults(list);
      setSelected(list[0] ?? null);
      setPage(nextPage);
    } catch (e: any) {
      setError(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const search = async (opts?: { nextPage?: number }) => {
    const nextPage = opts?.nextPage ?? 1;
    await searchInternal({ q: query.trim(), nextPage });
  };

  const pick = (img: StockImage) => {
    const captionParts = [
      "Pixabay",
      img.photographer ? `by ${img.photographer}` : "",
      img.sourcePage ? img.sourcePage : "",
    ].filter(Boolean);
    onPick({ url: img.full || img.thumb, caption: captionParts.join(" | ") });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose a stock image"
      size="6xl"
      className="rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pixabay stock photos
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Search and pick a free image to use as an inventory thumbnail.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Tip: try <span className="font-semibold">“{defaultQuery}”</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            label="Search (Pixabay)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. rice, beef, vegetables, juice"
            className="rounded-xl border-slate-200"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => search({ nextPage: 1 })}
              loading={loading}
              className="rounded-xl bg-linear-to-r from-[#ff6d00] to-[#ff9100] font-semibold text-white"
            >
              Search
            </Button>
          </div>
        </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {loading && results.length === 0
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="aspect-16/10 w-full animate-pulse bg-slate-100" />
                    <div className="p-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-50" />
                    </div>
                  </div>
                ))
              : results.map((img) => {
                  const isActive = selected?.id === img.id;
                  return (
                    <button
                      key={`pixabay-${img.id}`}
                      type="button"
                      onClick={() => {
                        setSelected(img);
                        pick(img);
                      }}
                      className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:shadow-md ${
                        isActive
                          ? "border-[#ff6d00] ring-2 ring-[#ff6d00]/20"
                          : "border-slate-200"
                      }`}
                      aria-label={`Use image ${img.alt || img.id}`}
                    >
                      <div className="aspect-16/10 w-full overflow-hidden bg-slate-100">
                        {img.thumb ? (
                          <img
                            src={img.thumb}
                            alt={img.alt || "Stock image"}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {img.alt || "Untitled"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {img.photographer ? `by ${img.photographer}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}

            {!loading && results.length === 0 && !error ? (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  No images yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Search for an item (e.g. “rice”) to see matching photos.
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Preview</p>
            {!selected ? (
              <p className="mt-2 text-sm text-slate-500">
                Select an image on the left to preview it here.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="aspect-16/10 overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={selected.full || selected.thumb}
                    alt={selected.alt || "Preview"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">
                    {selected.alt || "Untitled"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selected.photographer ? `by ${selected.photographer}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Tip: click any thumbnail to add it.
                  </p>
                  {selected.sourcePage ? (
                    <a
                      href={selected.sourcePage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#5a189a] hover:underline"
                    >
                      View on Pixabay
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {results.length ? (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Click any image to add it.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => search({ nextPage: Math.max(1, page - 1) })}
                disabled={loading || page <= 1}
                className="rounded-xl border-slate-200"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => search({ nextPage: page + 1 })}
                disabled={loading}
                className="rounded-xl border-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

