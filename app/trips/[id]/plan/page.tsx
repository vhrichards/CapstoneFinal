"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { Trip, getCurrentUser, getTripById, saveTripPlan } from "@/lib/trips";

export default function TripPlanPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");

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