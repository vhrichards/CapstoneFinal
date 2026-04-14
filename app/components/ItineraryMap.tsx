"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";

type MapPoint = {
  order: number;
  label: string;
  time: string;
  lon: number;
  lat: number;
};

type Props = {
  points: MapPoint[];
};

export default function ItineraryMap({ points }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const hasToken = Boolean(token);

  const lineCoordinates = useMemo(() => points.map((point) => [point.lon, point.lat]), [points]);

  useEffect(() => {
    if (!hasToken || !mapContainerRef.current || points.length === 0) {
      return;
    }

    mapboxgl.accessToken = token as string;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [points[0].lon, points[0].lat],
      zoom: 12,
    });

    const handleResize = () => map.resize();

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: lineCoordinates,
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "route-layer",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#005f73",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((point) => {
        bounds.extend([point.lon, point.lat]);

        const markerElement = document.createElement("div");
        markerElement.className = "itinerary-marker";
        markerElement.textContent = String(point.order);

        new mapboxgl.Marker({ element: markerElement })
          .setLngLat([point.lon, point.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(`${point.time} - ${point.label}`))
          .addTo(map);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 60,
          maxZoom: 14,
        });
      }

      // Ensure the canvas fully fills the styled container after initial render.
      requestAnimationFrame(() => map.resize());
    });

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
    };
  }, [hasToken, lineCoordinates, points, token]);

  if (!hasToken) {
    return (
      <p className="mt-4 text-sm font-semibold text-[var(--danger)]">
        NEXT_PUBLIC_MAPBOX_TOKEN is required for interactive map rendering.
      </p>
    );
  }

  return <div ref={mapContainerRef} className="itinerary-map mt-4 rounded-2xl border border-[#d8caab]" />;
}
