"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/google-maps";

export interface MapHotel {
  _id: string;
  slug?: string;
  name?: string;
  location?: { type: "Point"; coordinates: [number, number] };
}

interface DiscoveryMapProps {
  hotels: MapHotel[];
  center?: { lat: number; lng: number };
  className?: string;
}

export function DiscoveryMap({ hotels, center, className = "" }: DiscoveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const apiKey = getGoogleMapsApiKey();

  const points = hotels
    .filter((h) => h.location?.coordinates?.length === 2)
    .map((h) => ({
      id: h._id,
      lat: h.location!.coordinates[1],
      lng: h.location!.coordinates[0],
      name: h.name ?? "Hotel",
    }));

  useEffect(() => {
    if (!apiKey || apiKey.length < 15 || points.length === 0 || !mapRef.current) return;
    loadGoogleMapsScript(apiKey)
      .then(() => setReady(true))
      .catch(() => {});
  }, [apiKey, points.length]);

  useEffect(() => {
    if (!ready || !mapRef.current || points.length === 0) return;
    const g = (window as any).google;
    if (!g?.maps?.Map || !g?.maps?.Marker) return;

    const defaultCenter = center ?? { lat: points[0].lat, lng: points[0].lng };
    const map = new g.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: false,
    });

    const bounds = new g.maps.LatLngBounds();
    const markers: any[] = [];

    points.forEach((p) => {
      const pos = { lat: p.lat, lng: p.lng };
      bounds.extend(pos);
      const marker = new g.maps.Marker({
        position: pos,
        map,
        title: p.name,
      });
      markers.push(marker);
    });

    if (points.length > 1) map.fitBounds(bounds);
    return () => {};
  }, [ready, center, points]);

  if (!apiKey || apiKey.length < 15) return null;
  if (points.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
        <MapPin className="h-4 w-4 text-[#5a189a]" />
        Map view
      </div>
      <div ref={mapRef} className="h-64 w-full rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}
