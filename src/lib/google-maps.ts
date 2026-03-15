/**
 * Google Maps API key — same env var as restaurant-hub (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
 * Use for Maps JavaScript API, Places Autocomplete, Geocoding, etc.
 * Set in .env.local; see .env.example.
 */
export function getGoogleMapsApiKey(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string) ?? "";
  }
  return "";
}

export const GOOGLE_MAPS_SCRIPT_OPTIONS = {
  libraries: ["places"] as const,
  callbackName: "__googleMapsPlacesReady",
  scriptId: "google-maps-places-autocomplete",
};

/** Same as TwoStepAddressPicker so script is shared. */
const SCRIPT_ID_PLACE = "google-maps-places-autocomplete-hotel";
const CALLBACK_PLACE = "__googleMapsPlacesReadyHotel";

function isMapsApiKey(key: string): boolean {
  return typeof key === "string" && key.length > 10 && key.startsWith("AIzaSy");
}

/** Load Google Maps JS with Places (for place search / geocode). Resolves when ready. */
export function loadGoogleMapsScript(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (!isMapsApiKey(key)) return Promise.reject(new Error("Invalid key"));
  const existing = document.getElementById(SCRIPT_ID_PLACE);
  const g = (window as any).google;
  if (existing && g?.maps?.places) return Promise.resolve();
  if (existing) {
    return new Promise((resolve) => {
      const prev = (window as any)[CALLBACK_PLACE];
      (window as any)[CALLBACK_PLACE] = () => {
        if (typeof prev === "function") prev();
        (window as any)[CALLBACK_PLACE] = () => {};
        resolve();
      };
    });
  }
  return new Promise((resolve, reject) => {
    (window as any)[CALLBACK_PLACE] = () => {
      (window as any)[CALLBACK_PLACE] = () => {};
      resolve();
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID_PLACE;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${CALLBACK_PLACE}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      (window as any)[CALLBACK_PLACE] = () => {};
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
}

/** Fallback coordinates for common Ghana places when Google Geocoding is unavailable or fails. */
const GHANA_PLACES: Record<string, { lat: number; lng: number; label: string }> = {
  accra: { lat: 5.6037, lng: -0.187, label: "Accra, Ghana" },
  kumasi: { lat: 6.6884, lng: -1.6244, label: "Kumasi, Ghana" },
  tamale: { lat: 9.4039, lng: -0.843, label: "Tamale, Ghana" },
  takoradi: { lat: 4.8845, lng: -1.7554, label: "Takoradi, Ghana" },
  "cape coast": { lat: 5.1053, lng: -1.2466, label: "Cape Coast, Ghana" },
  sunyani: { lat: 7.3399, lng: -2.3268, label: "Sunyani, Ghana" },
  ho: { lat: 6.6009, lng: 0.4713, label: "Ho, Ghana" },
  bolgatanga: { lat: 10.7856, lng: -0.8514, label: "Bolgatanga, Ghana" },
  "east legon": { lat: 5.6167, lng: -0.1667, label: "East Legon, Accra" },
  "airport": { lat: 5.6052, lng: -0.1668, label: "Kotoka International Airport, Accra" },
  "kotoka": { lat: 5.6052, lng: -0.1668, label: "Kotoka International Airport, Accra" },
};

function getFallbackPlace(query: string): { lat: number; lng: number; label: string } | null {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (GHANA_PLACES[key]) return GHANA_PLACES[key];
  const match = Object.keys(GHANA_PLACES)
    .filter((k) => key.includes(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? GHANA_PLACES[match] : null;
}

/** Geocode an address/place string to { lat, lng }. Tries Google first, then Ghana fallback. */
export function geocodeAddress(key: string, address: string): Promise<{ lat: number; lng: number; label?: string } | null> {
  const fallback = getFallbackPlace(address);
  const g = (window as any).google;
  if (!g?.maps?.Geocoder) {
    return Promise.resolve(fallback);
  }
  const geocoder = new g.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode(
      { address: address.trim(), region: "gh" },
      (results: any[], status: string) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          return resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            label: results[0].formatted_address,
          });
        }
        resolve(fallback);
      }
    );
  });
}
