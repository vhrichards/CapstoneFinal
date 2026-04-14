"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import ItineraryMap from "@/app/components/ItineraryMap";
import { Trip, getCurrentUser, getTripById, saveTripPlan } from "@/lib/trips";

type MapPoint = {
  order: number;
  label: string;
  time: string;
  lon: number;
  lat: number;
};

type HotelRecommendation = {
  id: string;
  name: string;
  neighborhood: string;
  nightlyPrice: number | null;
  currency: string;
  rating: number | null;
  bookingUrl: string | null;
};

export default function TripPlanPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapError, setMapError] = useState("");
  const [hotels, setHotels] = useState<HotelRecommendation[]>([]);
  const [hotelsError, setHotelsError] = useState("");
  const [hotelsNote, setHotelsNote] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }

    let loadedTrip = getTripById(tripId);
    if (!loadedTrip) {
      return;
    }

    async function fetchPlanIfNeeded() {
      if (!loadedTrip) {
        return;
      }

      if (!loadedTrip.plan) {
        try {
          const response = await fetch("/api/itinerary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ trip: loadedTrip }),
          });

          const data = (await response.json()) as {
            error?: string;
            plan?: Trip["plan"];
          };

          if (!response.ok || !data.plan) {
            setError(data.error ?? "Failed to generate itinerary.");
            return;
          }

          const savedTrip = saveTripPlan(tripId, data.plan);
          if (!savedTrip) {
            setError("Trip could not be updated with generated itinerary.");
            return;
          }

          loadedTrip = savedTrip;
        } catch {
          setError("Unable to reach AI service right now.");
          return;
        }
      }

      if (loadedTrip) {
        setTrip(loadedTrip);
      }
    }

    fetchPlanIfNeeded();
  }, [tripId, router]);

  useEffect(() => {
    if (!trip?.plan) {
      return;
    }

    const destination = trip.destination;

    const stops = trip.plan.days.flatMap((day) =>
      day.stops.map((stop) => ({
        time: stop.time,
        title: stop.title,
      })),
    );

    async function fetchMapData() {
      setMapError("");
      try {
        const response = await fetch("/api/mapbox/itinerary-map", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destination,
            stops,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          mapUrl?: string;
          points?: MapPoint[];
        };

        if (!response.ok || !data.mapUrl || !Array.isArray(data.points)) {
          setMapError(data.error ?? "Map visualization unavailable.");
          return;
        }

        setMapUrl(data.mapUrl);
        setMapPoints(data.points);
      } catch {
        setMapError("Unable to load map right now.");
      }
    }

    fetchMapData();
  }, [trip]);

  useEffect(() => {
    if (!trip?.plan) {
      return;
    }

    const destination = trip.destination;
    const checkIn = trip.startDate;
    const checkOut = addDaysIso(trip.startDate, 3);

    const budgetValues = trip.budgets.map((entry) => entry.amount).filter((value) => value > 0);
    const budget =
      budgetValues.length > 0
        ? {
            min: Math.min(...budgetValues),
            max: Math.max(...budgetValues),
            average: Math.round(
              budgetValues.reduce((sum, value) => sum + value, 0) / budgetValues.length,
            ),
            currency: trip.budgets[0]?.currency ?? "USD",
          }
        : undefined;

    async function fetchHotels() {
      setHotelsError("");
      setHotelsNote("");
      try {
        const response = await fetch("/api/hotels/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destination,
            checkIn,
            checkOut,
            budget,
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          hotels?: HotelRecommendation[];
          source?: "local";
          note?: string;
        };

        if (!response.ok || !Array.isArray(data.hotels)) {
          setHotelsError(data.error ?? "Hotel recommendations unavailable right now.");
          return;
        }

        setHotels(data.hotels);
        if (data.note) {
          setHotelsNote(data.note);
        } else if (data.source === "local") {
          setHotelsNote("Showing local budget-aware hotel recommendations.");
        }
      } catch {
        setHotelsError("Unable to load hotel recommendations right now.");
      }
    }

    fetchHotels();
  }, [trip]);

  if (!trip || !trip.plan) {
    return (
      <main className="planner-shell">
        <NavBar />
        <section className="planner-panel mx-auto w-full max-w-4xl rounded-3xl p-8">
          <p className="text-lg text-[#355952]">Generating your itinerary...</p>
          {error && <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <article className="planner-panel rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a9396]">
            AI Itinerary
          </p>
          <h1 className="mt-1 text-4xl text-[#123a34]">{trip.title}</h1>
          <p className="mt-2 text-[#355952]">{trip.plan.summary}</p>
          <p className="mt-2 text-xs text-[#355952]">
            Generated: {new Date(trip.plan.generatedAt).toLocaleString()}
          </p>
        </article>

        <div className="grid gap-4 md:grid-cols-3">
          {trip.plan.days.map((day) => (
            <article key={day.day} className="planner-panel rounded-2xl p-5">
              <h2 className="text-2xl text-[#123a34]">{day.headline}</h2>
              <ul className="mt-3 space-y-3">
                {day.stops.map((stop) => (
                  <li key={`${day.day}-${stop.time}-${stop.title}`} className="rounded-xl bg-[#fff4da] p-3">
                    <p className="text-sm font-semibold text-[#0a9396]">{stop.time}</p>
                    <p className="font-semibold text-[#123a34]">{stop.title}</p>
                    <p className="text-sm text-[#355952]">{stop.details}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <article className="planner-panel rounded-3xl p-6">
          <h2 className="text-2xl text-[#123a34]">Map View of Recommended Route</h2>
          <p className="mt-1 text-sm text-[#355952]">
            Powered by Mapbox geocoding for itinerary stops.
          </p>
          {mapPoints.length > 0 ? (
            <ItineraryMap points={mapPoints} />
          ) : mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapUrl}
              alt="Map of itinerary route"
              className="mt-4 w-full rounded-2xl border border-[#d8caab]"
              loading="eager"
              decoding="async"
            />
          ) : (
            <p className="mt-4 text-sm text-[#355952]">Loading map preview...</p>
          )}
          {mapError && <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{mapError}</p>}
          {mapPoints.length > 0 && (
            <ol className="mt-4 grid gap-2 md:grid-cols-2">
              {mapPoints.map((point) => (
                <li key={`${point.order}-${point.label}`} className="rounded-xl bg-[#fff4da] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0a9396]">
                    Stop {point.order} at {point.time}
                  </p>
                  <p className="font-semibold text-[#123a34]">{point.label}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="planner-panel rounded-3xl p-6">
          <h2 className="text-2xl text-[#123a34]">Recommended Hotels</h2>
          <p className="mt-1 text-sm text-[#355952]">
            Curated using your destination, travel dates, and submitted budget preferences.
          </p>

          {hotelsError && <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{hotelsError}</p>}
          {hotelsNote && <p className="mt-3 text-xs text-[#355952]">{hotelsNote}</p>}

          {hotels.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {hotels.map((hotel) => (
                <article key={hotel.id} className="rounded-xl border border-[#d8caab] bg-[#fff4da] p-4">
                  <h3 className="text-lg font-semibold text-[#123a34]">{hotel.name}</h3>
                  <p className="text-sm text-[#355952]">{hotel.neighborhood}</p>
                  <p className="mt-2 text-sm font-semibold text-[#0a9396]">
                    {hotel.nightlyPrice !== null
                      ? `${hotel.currency} ${hotel.nightlyPrice.toFixed(0)} / night`
                      : "Price unavailable"}
                  </p>
                  <p className="text-xs text-[#355952]">
                    {hotel.rating !== null ? `Rating: ${hotel.rating}/5` : "Rating unavailable"}
                  </p>
                  {hotel.bookingUrl && (
                    <a
                      href={hotel.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="planner-link mt-3 inline-block rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      View Hotel
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : !hotelsError ? (
            <p className="mt-4 text-sm text-[#355952]">Loading hotel recommendations...</p>
          ) : null}
        </article>

        <Link
          href={`/trips/${trip.id}`}
          className="planner-link inline-block rounded-xl px-4 py-3 text-sm font-semibold"
        >
          Back to Trip Board
        </Link>
      </section>
    </main>
  );
}

function addDaysIso(startDate: string, daysToAdd: number): string {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) {
    return startDate;
  }

  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}