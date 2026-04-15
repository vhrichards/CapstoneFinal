import { NextResponse } from "next/server";

type StopInput = {
  time: string;
  title: string;
};

type PointOutput = {
  order: number;
  label: string;
  time: string;
  lon: number;
  lat: number;
  approximate?: boolean;
};

export async function POST(request: Request) {
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Mapbox token missing. Set MAPBOX_ACCESS_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      destination?: string;
      stops?: StopInput[];
    };

    if (!body.destination || !Array.isArray(body.stops) || body.stops.length === 0) {
      return NextResponse.json(
        { error: "destination and stops are required." },
        { status: 400 },
      );
    }

    const destinationContext = await geocodeDestination(body.destination, token);
    if (!destinationContext) {
      return NextResponse.json(
        { error: "Could not locate destination for map context." },
        { status: 502 },
      );
    }

    const points: PointOutput[] = [];

    for (let i = 0; i < body.stops.length; i += 1) {
      const stop = body.stops[i];
      const center = await geocodeStop(stop.title, body.destination, token, destinationContext);
      if (!center || center.length < 2) {
        points.push({
          order: i + 1,
          label: `${stop.title} (approx near destination)`,
          time: stop.time,
          lon: destinationContext.center[0],
          lat: destinationContext.center[1],
          approximate: true,
        });
        continue;
      }

      const distanceKm = haversineKm(
        destinationContext.center[1],
        destinationContext.center[0],
        center[1],
        center[0],
      );

      // Guard against globally ambiguous POIs by rejecting far-away geocodes.
      if (distanceKm > 120) {
        points.push({
          order: i + 1,
          label: `${stop.title} (approx near destination)`,
          time: stop.time,
          lon: destinationContext.center[0],
          lat: destinationContext.center[1],
          approximate: true,
        });
        continue;
      }

      points.push({
        order: i + 1,
        label: stop.title,
        time: stop.time,
        lon: center[0],
        lat: center[1],
      });
    }

    const visiblePoints = spreadOverlappingPoints(points);

    if (visiblePoints.length === 0) {
      return NextResponse.json(
        { error: "Could not geocode itinerary stops for map display." },
        { status: 502 },
      );
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: visiblePoints.map((point) => [point.lon, point.lat]),
          },
          properties: {
            stroke: "#005f73",
            "stroke-width": 4,
            "stroke-opacity": 0.8,
          },
        },
        ...visiblePoints.map((point) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lon, point.lat],
          },
          properties: {
            title: point.label,
            "marker-color": "#0a9396",
            "marker-size": "medium",
            "marker-symbol": `${point.order}`,
          },
        })),
      ],
    };

    const encodedOverlay = encodeURIComponent(JSON.stringify(geojson));
    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/geojson(${encodedOverlay})/auto/1200x700?padding=70&access_token=${token}`;

    return NextResponse.json({
      points: visiblePoints,
      mapUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Mapbox error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type DestinationContext = {
  center: [number, number];
  bbox?: [number, number, number, number];
};

async function geocodeDestination(
  destination: string,
  token: string,
): Promise<DestinationContext | null> {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?limit=1&types=place,region,country,locality&access_token=${token}`;
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    features?: Array<{ center?: [number, number]; bbox?: [number, number, number, number] }>;
  };
  const feature = data.features?.[0];
  const center = feature?.center;
  if (!center || center.length < 2) {
    return null;
  }

  return {
    center,
    bbox: feature?.bbox,
  };
}

function buildStopEndpoint(query: string, token: string, destination: DestinationContext): string {
  const params = new URLSearchParams({
    limit: "1",
    access_token: token,
    proximity: `${destination.center[0]},${destination.center[1]}`,
    autocomplete: "false",
    types: "poi,address",
  });

  if (destination.bbox) {
    params.set("bbox", destination.bbox.join(","));
  }

  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;
}

async function geocodeStop(
  title: string,
  destinationName: string,
  token: string,
  destination: DestinationContext,
): Promise<[number, number] | null> {
  const primaryQuery = `${title}, ${destinationName}`;
  const primary = await fetchCenter(buildStopEndpoint(primaryQuery, token, destination));

  if (primary && !isNearCenter(primary, destination.center)) {
    return primary;
  }

  // Retry with a broader query if the first result collapses to city center.
  const retryParams = new URLSearchParams({
    limit: "1",
    access_token: token,
    proximity: `${destination.center[0]},${destination.center[1]}`,
    autocomplete: "false",
    types: "poi,address,place",
  });
  const retryQuery = `${title} near ${destinationName}`;
  const retryEndpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(retryQuery)}.json?${retryParams.toString()}`;
  const retry = await fetchCenter(retryEndpoint);

  const preferred = retry ?? primary ?? null;
  if (preferred && !isNearCenter(preferred, destination.center)) {
    return preferred;
  }

  // Fallback for landmark-style activity names when Mapbox geocoder lacks POI depth.
  const fallback = await geocodeWithNominatim(`${title}, ${destinationName}`);
  if (fallback) {
    return fallback;
  }

  return preferred;
}

async function fetchCenter(endpoint: string): Promise<[number, number] | null> {
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    features?: Array<{ center?: [number, number] }>;
  };

  const center = data.features?.[0]?.center;
  if (!center || center.length < 2) {
    return null;
  }

  return center;
}

function isNearCenter(point: [number, number], center: [number, number]): boolean {
  const distanceKm = haversineKm(center[1], center[0], point[1], point[0]);
  return distanceKm < 1;
}

async function geocodeWithNominatim(query: string): Promise<[number, number] | null> {
  const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "PlannerMVP/1.0 (trip route mapping)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ lon?: string; lat?: string }>;
  const first = data?.[0];
  if (!first?.lon || !first?.lat) {
    return null;
  }

  const lon = Number(first.lon);
  const lat = Number(first.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return [lon, lat];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function spreadOverlappingPoints(points: PointOutput[]): PointOutput[] {
  const grouped = new Map<string, PointOutput[]>();

  points.forEach((point) => {
    const key = `${point.lon.toFixed(5)}:${point.lat.toFixed(5)}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(point);
    grouped.set(key, bucket);
  });

  const adjusted: PointOutput[] = [];

  grouped.forEach((bucket) => {
    if (bucket.length === 1) {
      adjusted.push(bucket[0]);
      return;
    }

    const approximateCount = bucket.filter((point) => point.approximate).length;
    const baseRadiusKm = approximateCount > 0 ? 0.5 : 0.12;

    bucket.forEach((point, index) => {
      const angle = (index / bucket.length) * Math.PI * 2;
      const radiusKm = baseRadiusKm + Math.floor(index / 8) * 0.08;
      const jittered = offsetByKm(point, radiusKm, angle);
      adjusted.push(jittered);
    });
  });

  return adjusted.sort((a, b) => a.order - b.order);
}

function offsetByKm(point: PointOutput, radiusKm: number, angleRad: number): PointOutput {
  // Convert km offsets to degrees; longitude shrinks by latitude cosine.
  const deltaLat = (radiusKm * Math.sin(angleRad)) / 110.574;
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const safeCosLat = Math.abs(cosLat) < 0.0001 ? 0.0001 : cosLat;
  const deltaLon = (radiusKm * Math.cos(angleRad)) / (111.32 * safeCosLat);

  return {
    ...point,
    lon: point.lon + deltaLon,
    lat: point.lat + deltaLat,
  };
}
