"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const GEOLOCATION_TIMEOUT_MS = 15000;
const GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes - use cached position if available

/** Default center (Accra, Ghana) when geolocation is unavailable - keeps discovery useful. */
export const DEFAULT_CENTER = { lat: 5.6037, lng: -0.187 };

export type GeolocationStatus = "idle" | "loading" | "success" | "error";

export interface GeolocationState {
  position: { lat: number; lng: number } | null;
  error: string | null;
  status: GeolocationStatus;
  retry: () => void;
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location access denied. Use the search box below to enter a place or address.";
    case 2:
      return "Location unavailable. Use the search box below to enter a place or address.";
    case 3:
      return "Location request timed out. Use the search box below or try again.";
    default:
      return "Could not get location. Use the search box below to enter a place or address.";
  }
}

/**
 * Production-ready geolocation hook with timeout, cache, and retry.
 * Use for discovery/nearby features. Prefer enableHighAccuracy: false for faster response.
 */
export function useGeolocation(options?: { skip?: boolean }): GeolocationState {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const initialRequestDone = useRef(false);

  const requestPosition = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported in this browser.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setError(null);
        setStatus("success");
      },
      (err: GeolocationPositionError) => {
        setPosition(null);
        setError(getErrorMessage(err.code));
        setStatus("error");
      },
      {
        enableHighAccuracy: false,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      }
    );
  }, []);

  useEffect(() => {
    if (options?.skip || initialRequestDone.current) return;
    initialRequestDone.current = true;
    requestPosition();
  }, [options?.skip, requestPosition]);

  return {
    position,
    error,
    status,
    retry: requestPosition,
  };
}
