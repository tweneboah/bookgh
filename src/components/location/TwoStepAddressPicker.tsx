"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MapPin, Search, X } from "lucide-react";
import { getGoogleMapsApiKey } from "@/lib/google-maps";

export interface AddressResult {
  address: string;
  city: string;
  /** Region/state (e.g. Greater Accra). Map to Branch.region / Tenant.region. */
  state: string;
  country: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface TwoStepAddressPickerProps {
  onSelect: (result: AddressResult) => void;
  country?: string;
  initialResult?: AddressResult | null;
}

const SCRIPT_ID = "google-maps-places-autocomplete-hotel";
const CALLBACK_NAME = "__googleMapsPlacesReadyHotel";

function isMapsApiKey(key: string): boolean {
  return typeof key === "string" && key.length > 10 && key.startsWith("AIzaSy");
}

function ensurePacContainerStyle() {
  if (typeof document === "undefined") return;
  const id = "address-autocomplete-pac-style-hotel";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `.pac-container { z-index: 99999 !important; font-family: inherit; }`;
  document.head.appendChild(style);
}

function loadScript(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (!isMapsApiKey(key)) return Promise.reject(new Error("Invalid key"));
  const existing = document.getElementById(SCRIPT_ID);
  const g = (window as any).google;
  if (existing && g?.maps?.places) {
    ensurePacContainerStyle();
    return Promise.resolve();
  }
  if (existing) {
    return new Promise((resolve) => {
      const prev = (window as any)[CALLBACK_NAME];
      (window as any)[CALLBACK_NAME] = () => {
        if (typeof prev === "function") prev();
        (window as any)[CALLBACK_NAME] = () => {};
        ensurePacContainerStyle();
        resolve();
      };
    });
  }
  return new Promise((resolve, reject) => {
    (window as any)[CALLBACK_NAME] = () => {
      (window as any)[CALLBACK_NAME] = () => {};
      ensurePacContainerStyle();
      resolve();
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      (window as any)[CALLBACK_NAME] = () => {};
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });
}

function getComponent(
  place: { address_components?: { types: string[]; long_name: string }[] },
  type: string
): string {
  return place.address_components?.find((c) => c.types.includes(type))?.long_name ?? "";
}

const PLUS_CODE_RE = /^[A-Z0-9]{4,}\+[A-Z0-9]+,?\s*/i;

function buildResult(place: any): AddressResult | null {
  if (!place?.geometry?.location) return null;
  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();
  const city =
    getComponent(place, "locality") ||
    getComponent(place, "administrative_area_level_2") ||
    getComponent(place, "sublocality") ||
    "";
  const state = getComponent(place, "administrative_area_level_1") || "";
  const countryName = getComponent(place, "country") || "Ghana";
  let address = place.formatted_address ?? "";
  if (PLUS_CODE_RE.test(address)) {
    const name = place.name || place.vicinity || "";
    const parts = [name, city, state, countryName].filter(Boolean);
    address = parts.filter((p, i) => i === 0 || p !== parts[i - 1]).join(", ");
  }
  return { address, city, state, country: countryName, lat, lng, placeId: place.place_id };
}

const INPUT_CLS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors focus:border-[#5a189a] focus:outline-none focus:ring-2 focus:ring-[#5a189a]/20 placeholder:text-slate-400";

export function TwoStepAddressPicker({
  onSelect,
  country = "gh",
  initialResult,
}: TwoStepAddressPickerProps) {
  const apiKey = getGoogleMapsApiKey();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const [broadResult, setBroadResult] = useState<AddressResult | null>(initialResult ?? null);
  const broadInputRef = useRef<HTMLInputElement>(null);
  const broadAutocompleteRef = useRef<any>(null);

  const [preciseResult, setPreciseResult] = useState<AddressResult | null>(initialResult ?? null);
  const preciseInputRef = useRef<HTMLInputElement>(null);
  const preciseAutocompleteRef = useRef<any>(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!apiKey || !isMapsApiKey(apiKey)) return;
    loadScript(apiKey)
      .then(() => setScriptLoaded(true))
      .catch(() => {});
  }, [apiKey]);

  useEffect(() => {
    if (!scriptLoaded || broadResult || !broadInputRef.current) return;
    const g = (window as any).google;
    if (!g?.maps?.places?.Autocomplete) return;
    if (broadAutocompleteRef.current) return;
    const countryList = country ? country.toLowerCase().split(",").map((c) => c.trim()) : undefined;
    const ac = new g.maps.places.Autocomplete(broadInputRef.current, {
      fields: ["formatted_address", "geometry", "address_components", "place_id", "name", "vicinity"],
      types: ["(regions)"],
      componentRestrictions: countryList ? { country: countryList } : undefined,
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const result = buildResult(place);
      if (result) {
        setBroadResult(result);
        setPreciseResult(null);
        preciseAutocompleteRef.current = null;
      }
    });
    broadAutocompleteRef.current = ac;
    return () => {
      broadAutocompleteRef.current = null;
    };
  }, [scriptLoaded, broadResult, country]);

  useEffect(() => {
    if (!scriptLoaded || !broadResult || !preciseInputRef.current) return;
    const g = (window as any).google;
    if (!g?.maps?.places?.Autocomplete) return;
    if (preciseAutocompleteRef.current) return;
    const countryList = country ? country.toLowerCase().split(",").map((c) => c.trim()) : undefined;
    const { lat, lng } = broadResult;
    const delta = 0.05;
    const bounds = new g.maps.LatLngBounds(
      new g.maps.LatLng(lat - delta, lng - delta),
      new g.maps.LatLng(lat + delta, lng + delta)
    );
    const ac = new g.maps.places.Autocomplete(preciseInputRef.current, {
      fields: ["formatted_address", "geometry", "address_components", "place_id", "name", "vicinity"],
      types: ["geocode", "establishment"],
      componentRestrictions: countryList ? { country: countryList } : undefined,
      bounds,
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const result = buildResult(place);
      if (result) {
        setPreciseResult(result);
        onSelectRef.current(result);
      }
    });
    preciseAutocompleteRef.current = ac;
    setTimeout(() => preciseInputRef.current?.focus(), 100);
    return () => {
      preciseAutocompleteRef.current = null;
    };
  }, [scriptLoaded, broadResult, country]);

  const handleChangeBroad = useCallback(() => {
    setBroadResult(null);
    setPreciseResult(null);
    broadAutocompleteRef.current = null;
    preciseAutocompleteRef.current = null;
    setTimeout(() => broadInputRef.current?.focus(), 50);
  }, []);

  if (!apiKey || !isMapsApiKey(apiKey)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in .env.local to use map address search.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!broadResult ? (
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MapPin className="h-4 w-4 text-[#5a189a]" />
            Step 1: Select your area
          </label>
          <input
            ref={broadInputRef}
            type="text"
            className={INPUT_CLS}
            placeholder="Type your city or area, e.g. Kumasi Atonsu, Accra East Legon..."
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-slate-400">
            Start typing and select from the suggestions to set your general area.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              Area
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
                ✓ {broadResult.address}
              </div>
              <button
                type="button"
                onClick={handleChangeBroad}
                className="shrink-0 rounded-lg border border-slate-300 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-[#5a189a]"
                title="Change area"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Search className="h-4 w-4 text-[#5a189a]" />
              Step 2: Find your exact address
            </label>
            <input
              ref={preciseInputRef}
              type="text"
              className={INPUT_CLS}
              placeholder={`Search for address or landmark near ${broadResult.city || broadResult.address.split(",")[0]}...`}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-slate-400">
              Type a street, building or landmark to find your precise location.
            </p>
          </div>

          {preciseResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
              <p className="text-xs font-medium text-emerald-700">✓ Final address selected</p>
              <p className="mt-0.5 text-sm text-emerald-800">{preciseResult.address}</p>
              {(preciseResult.city || preciseResult.state) && (
                <p className="mt-0.5 text-xs text-emerald-600">
                  {preciseResult.city}
                  {preciseResult.state ? `, ${preciseResult.state}` : ""}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
