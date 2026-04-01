"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NavBar from "@/app/components/NavBar";
import { getCurrentUser, getTrips } from "@/lib/trips";

export default function HomePage() {
  const [user, setUser] = useState("");
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    const foundUser = getCurrentUser();
    if (!foundUser) {
      window.location.href = "/login";
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(foundUser);
    const myTrips = getTrips().filter((trip) => trip.members.includes(foundUser));
    setTripCount(myTrips.length);
  }, []);

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <article className="planner-panel rounded-3xl p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a9396]">Dashboard</p>
          <h1 className="mt-2 text-4xl text-[#113632]">
            Welcome to PlannerMVP{user ? `, ${user}` : ""}.
          </h1>
          <p className="mt-3 max-w-xl text-[#335954]">
            Plan together without chaos. Your group can add ideas, vote on the best options,
            and generate an itinerary powered by everyone&apos;s preferences.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link href="/trips/create" className="planner-link rounded-2xl p-4 text-sm font-semibold">
              Create a New Trip
            </Link>
            <Link href="/trips/join" className="planner-link rounded-2xl p-4 text-sm font-semibold">
              Join Existing Trip
            </Link>
            <Link href="/trips/saved" className="planner-link rounded-2xl p-4 text-sm font-semibold">
              View Saved Trips
            </Link>
          </div>
        </article>

        <aside className="planner-panel rounded-3xl p-8">
          <h2 className="text-2xl text-[#123b35]">Trip Snapshot</h2>
          <p className="mt-2 text-[#335954]">You currently belong to:</p>
          <p className="mt-3 text-5xl font-extrabold text-[#0a9396]">{tripCount}</p>
          <p className="mt-1 text-sm text-[#335954]">active trip{tripCount === 1 ? "" : "s"}</p>
        </aside>
      </section>
    </main>
  );
}