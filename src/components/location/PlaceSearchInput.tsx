"use client";

import { useRef, useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { getGoogleMapsApiKey, loadGoogleMapsScript, geocodeAddress } from "@/lib/google-maps";

export interface PlaceSearchResult {
  lat: number;
  lng: number;
  label?: string;
}

interface PlaceSearchInputProps {
  onSelect: (result: PlaceSearchResult) => void;
  placeholder?: string;
  className?: string;
}

function isMapsApiKey(key: string): boolean {
  return typeof key === "string" && key.length > 10 && key.startsWith("AIzaSy");
}

export function PlaceSearchInput({
  onSelect,
  placeholder = "e.g. Accra Airport, East Legon, or Ghana digital address (Plus Code)",
  className = "",
}: PlaceSearchInputProps) {
  const apiKey = getGoogleMapsApiKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [query, setQuery] = useState("");
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !isMapsApiKey(apiKey)) return;
    loadGoogleMapsScript(apiKey)
      .then(() => setScriptReady(true))
      .catch(() => setGeocodeError("Could not load maps. Check your connection."));
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || !scriptReady) return;
    setGeocodeError(null);
    setGeocoding(true);
    try {
      const result = await geocodeAddress(apiKey, q);
      if (result) {
        onSelect({ lat: result.lat, lng: result.lng, label: result.label });
      } else {
        setGeocodeError("Could not find that place. Try a different address or name (e.g. \"Accra\", \"East Legon\").");
      }
    } catch {
      setGeocodeError("Search failed. Try again or use a different place name.");
    } finally {
      setGeocoding(false);
    }
  };

  if (!apiKey || !isMapsApiKey(apiKey)) {
    return (
      <div className={`rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 ${className}`}>
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for place search.
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setGeocodeError(null);
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20"
            disabled={!scriptReady}
          />
        </div>
        <button
          type="submit"
          disabled={!scriptReady || !query.trim() || geocoding}
          className="rounded-lg bg-[#5a189a] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search area"}
        </button>
      </form>
      {geocodeError && (
        <p className="mt-2 text-sm text-amber-700" role="alert">
          {geocodeError}
        </p>
      )}
    </div>
  );
}
