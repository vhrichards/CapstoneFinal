"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { createTrip, getCurrentUser } from "@/lib/trips";

export default function CreateTripPage() {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [theme, setTheme] = useState("");
  const [user, setUser] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const found = getCurrentUser();
    if (!found) {
      router.push("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(found);
  }, [router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title || !destination || !startDate || !theme) {
      setError("Please fill in all fields.");
      return;
    }

    const trip = createTrip({
      title,
      destination,
      startDate,
      theme,
      creator: user,
    });

    router.push(`/trips/${trip.id}`);
  }

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="planner-panel mx-auto w-full max-w-3xl rounded-3xl p-8">
        <h1 className="text-4xl text-[#123a34]">Create a New Trip</h1>
        <p className="mt-2 text-[#355952]">
          Build the trip shell first. Then invite others with your trip code.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <input
            className="planner-input rounded-xl px-4 py-3"
            placeholder="Trip name (e.g. Euro Summer Sprint)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="planner-input rounded-xl px-4 py-3"
            placeholder="Destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
          <input
            className="planner-input rounded-xl px-4 py-3"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <textarea
            className="planner-input min-h-28 rounded-xl px-4 py-3"
            placeholder="Trip vibe/theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          />
          {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
          <button className="planner-link rounded-xl px-5 py-3 font-semibold" type="submit">
            Create Trip
          </button>
        </form>
      </section>
    </main>
  );
}