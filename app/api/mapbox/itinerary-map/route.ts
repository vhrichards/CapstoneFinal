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

    if (points.length === 0) {
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
            coordinates: points.map((point) => [point.lon, point.lat]),
          },
          properties: {
            stroke: "#005f73",
            "stroke-width": 4,
            "stroke-opacity": 0.8,
          },
        },
        ...points.map((point) => ({
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
      points,
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
  label: string;
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
    label: destination,
  };
}

function buildStopEndpoint(
  query: string,
  token: string,
  destination: DestinationContext,
  limit: number,
): string {
  const params = new URLSearchParams({
    limit: String(limit),
    access_token: token,
    proximity: `${destination.center[0]},${destination.center[1]}`,
    autocomplete: "true",
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
  const primaryDestination = destinationName.split(",")[0]?.trim() ?? destinationName.trim();
  const mapboxQueries = buildMapboxQueries(title, primaryDestination);

  for (const query of mapboxQueries) {
    const candidates = await fetchCentersWithLabels(buildStopEndpoint(query, token, destination, 5));
    const best = pickBestCandidate(title, destinationName, destination, candidates);
    if (best) {
      return best;
    }
  }

  // Retry with a broader query if primary candidates are weak or empty.
  const retryParams = new URLSearchParams({
    limit: "5",
    access_token: token,
    proximity: `${destination.center[0]},${destination.center[1]}`,
    autocomplete: "true",
  });
  const retryQuery = `${normalizeLandmarkTitle(title)} near ${primaryDestination}`;
  const retryEndpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(retryQuery)}.json?${retryParams.toString()}`;
  const retryCandidates = await fetchCentersWithLabels(retryEndpoint);
  const retry = pickBestCandidate(title, destinationName, destination, retryCandidates);
  if (retry) {
    return retry;
  }

  // Last resort fallback for landmark-style names.
  const fallback = await geocodeWithNominatim(`${normalizeLandmarkTitle(title)} ${primaryDestination}`);
  if (fallback) {
    const distanceKm = haversineKm(
      destination.center[1],
      destination.center[0],
      fallback[1],
      fallback[0],
    );

    if (distanceKm <= 60) {
      return fallback;
    }
  }

  return null;
}

function buildMapboxQueries(title: string, primaryDestination: string): string[] {
  const normalized = normalizeLandmarkTitle(title);
  const aliased = applyLandmarkAliases(normalized || title);

  const queries = [
    `${aliased} ${primaryDestination}`,
    `${normalized} ${primaryDestination}`,
    `${title} ${primaryDestination}`,
    aliased,
    normalized,
  ].filter((value) => value.trim().length > 0);

  const loweredTitle = title.toLowerCase();
  if (loweredTitle.includes("vatican") && loweredTitle.includes("museum")) {
    queries.unshift("Vatican City");
    queries.unshift("Vatican Museums");
  }

  return Array.from(new Set(queries));
}

function normalizeLandmarkTitle(title: string): string {
  return title
    .replace(
      /\b(roman|guided|famous|historic|local|best|tour|stop|experience|walking|food|wine|tasting|class|workshop|visit|activity)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function applyLandmarkAliases(value: string): string {
  return value
    .replace(/\bcolosseum\b/gi, "Colosseo")
    .replace(/\bvatican museums?\b/gi, "Musei Vaticani")
    .trim();
}

type GeocodeCandidate = {
  center: [number, number];
  label: string;
};

async function fetchCentersWithLabels(endpoint: string): Promise<GeocodeCandidate[]> {
  const response = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    features?: Array<{ center?: [number, number]; place_name?: string; text?: string }>;
  };

  return (data.features ?? [])
    .map((feature) => ({
      center: feature.center,
      label: feature.place_name ?? feature.text ?? "",
    }))
    .filter(
      (feature): feature is { center: [number, number]; label: string } =>
        Array.isArray(feature.center) && feature.center.length >= 2,
    );
}

function isNearCenter(point: [number, number], center: [number, number]): boolean {
  const distanceKm = haversineKm(center[1], center[0], point[1], point[0]);
  return distanceKm < 1;
}

function pickBestCandidate(
  stopTitle: string,
  destinationName: string,
  destination: DestinationContext,
  candidates: GeocodeCandidate[],
): [number, number] | null {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedStop = normalizeLandmarkTitle(stopTitle);
  const stopTokens = Array.from(
    new Set([
      ...tokenize(normalizedStop),
      ...tokenize(applyLandmarkAliases(normalizedStop)),
    ]),
  );
  const destinationTokens = tokenize(destinationName);
  const destinationLabelTokens = tokenize(destination.label);

  let best: { score: number; center: [number, number] } | null = null;

  for (const candidate of candidates) {
    const distanceKm = haversineKm(
      destination.center[1],
      destination.center[0],
      candidate.center[1],
      candidate.center[0],
    );

    // Keep likely nearby POIs and reject very far mismatches.
    if (distanceKm > 60) {
      continue;
    }

    const labelTokens = tokenize(candidate.label);
    const stopMatch = overlapRatio(stopTokens, labelTokens);
    const destinationMatch = Math.max(
      overlapRatio(destinationTokens, labelTokens),
      overlapRatio(destinationLabelTokens, labelTokens),
    );
    const nearCenter = isNearCenter(candidate.center, destination.center);

    if (stopTokens.length > 0 && stopMatch < 0.25) {
      continue;
    }

    // Skip vague city-center matches when the stop title terms are absent.
    if (stopTokens.length > 0 && stopMatch === 0 && nearCenter) {
      continue;
    }

    if (stopTokens.length > 0 && stopMatch < 0.25 && nearCenter) {
      continue;
    }

    const nearCenterPenalty = nearCenter ? -8 : 0;
    const distanceScore = Math.max(0, 30 - distanceKm / 2);
    const score = stopMatch * 55 + destinationMatch * 25 + distanceScore + nearCenterPenalty;

    if (!best || score > best.score) {
      best = { score, center: candidate.center };
    }
  }

  if (!best) {
    return null;
  }

  return best.center;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function overlapRatio(source: string[], target: string[]): number {
  if (source.length === 0 || target.length === 0) {
    return 0;
  }

  const targetSet = new Set(target);
  const matches = source.filter((token) => targetSet.has(token)).length;
  return matches / source.length;
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
