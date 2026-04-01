"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NavBar from "@/app/components/NavBar";
import { Trip, getCurrentUser, getTrips } from "@/lib/trips";

export default function SavedTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const foundUser = getCurrentUser();
    if (!foundUser) {
      window.location.href = "/login";
      return;
    }

    const joinedTrips = getTrips().filter((trip) => trip.members.includes(foundUser));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrips(joinedTrips);
  }, []);

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="mb-5 text-4xl text-[#123a34]">Saved Trips</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <article key={trip.id} className="planner-panel rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a9396]">
                {trip.id}
              </p>
              <h2 className="mt-1 text-2xl text-[#123a34]">{trip.title}</h2>
              <p className="mt-1 text-[#355952]">{trip.destination}</p>
              <p className="mt-1 text-sm text-[#355952]">Theme: {trip.theme}</p>
              <p className="mt-2 text-sm text-[#355952]">{trip.members.length} collaborators</p>
              <Link
                href={`/trips/${trip.id}`}
                className="planner-link mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold"
              >
                Open Trip
              </Link>
            </article>
          ))}
        </div>
        {trips.length === 0 && (
          <p className="planner-panel rounded-2xl p-5 text-[#355952]">
            No saved trips yet. Create one or join with a code.
          </p>
        )}
      </section>
    </main>
  );
}