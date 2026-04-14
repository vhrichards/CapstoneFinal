"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import {
  IdeaCategory,
  Trip,
  addIdeaToTrip,
  addBudgetToTrip,
  getCurrentUser,
  getTripById,
  saveTripPlan,
  voteForIdea,
} from "@/lib/trips";

const categories: IdeaCategory[] = ["Food", "Adventure", "Culture", "Stay", "Nightlife", "Nature"];

export default function TripDetailsPage() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [user, setUser] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("Food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [error, setError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);

  useEffect(() => {
    const found = getCurrentUser();
    if (!found) {
      router.push("/login");
      return;
    }

    setUser(found);
    const tripData = getTripById(tripId);
    if (!tripData) {
      setError("Trip not found.");
      return;
    }

    setTrip(tripData);
  }, [tripId, router]);

  const sortedIdeas = useMemo(() => {
    if (!trip) {
      return [];
    }
    return [...trip.ideas].sort((a, b) => b.votes - a.votes);
  }, [trip]);

  const budgetSummary = useMemo(() => {
    if (!trip || trip.budgets.length === 0) {
      return null;
    }

    const amounts = trip.budgets.map((entry) => entry.amount);
    const avg = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
    return {
      average: Math.round(avg),
      minimum: Math.min(...amounts),
      maximum: Math.max(...amounts),
      count: amounts.length,
      currency: trip.budgets[0]?.currency ?? "USD",
    };
  }, [trip]);

  function refreshTrip() {
    const updated = getTripById(tripId);
    if (updated) {
      setTrip(updated);
    }
  }

  function handleVote(ideaId: string) {
    voteForIdea(tripId, ideaId);
    refreshTrip();
  }

  function handleAddIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ideaText.trim()) {
      setError("Write a preference before submitting.");
      return;
    }

    addIdeaToTrip({
      tripId,
      text: ideaText.trim(),
      category,
      author: user,
    });

    setIdeaText("");
    setError("");
    refreshTrip();
  }

  function handleSaveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(budgetAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid budget amount.");
      return;
    }

    addBudgetToTrip({
      tripId,
      user,
      amount,
      currency: "USD",
    });

    setBudgetAmount("");
    setError("");
    refreshTrip();
  }

  async function handlePlanTrip() {
    if (!trip) {
      return;
    }

    setError("");
    setIsPlanning(true);

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trip }),
      });

      const data = (await response.json()) as {
        error?: string;
        plan?: Trip["plan"];
      };

      if (!response.ok || !data.plan) {
        setError(data.error ?? "Failed to generate itinerary.");
        return;
      }

      saveTripPlan(tripId, data.plan);
      router.push(`/trips/${tripId}/plan`);
    } catch {
      setError("Unable to reach AI service right now. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  }

  if (!trip) {
    return (
      <main className="planner-shell">
        <NavBar />
        <section className="planner-panel mx-auto w-full max-w-4xl rounded-3xl p-8">
          <p className="text-lg font-semibold text-[var(--danger)]">{error || "Loading trip..."}</p>
          <Link href="/trips/saved" className="planner-link mt-4 inline-block rounded-lg px-4 py-2">
            Back to Saved Trips
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <article className="planner-panel rounded-3xl p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0a9396]">{trip.id}</p>
          <h1 className="mt-1 text-4xl text-[#123a34]">{trip.title}</h1>
          <p className="mt-2 text-[#355952]">{trip.destination}</p>
          <p className="mt-1 text-sm text-[#355952]">Theme: {trip.theme}</p>
          <p className="mt-1 text-sm text-[#355952]">Members: {trip.members.join(", ")}</p>

          <h2 className="mt-8 text-2xl text-[#123a34]">Group Preferences & Voting</h2>
          <div className="mt-4 space-y-3">
            {sortedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-2xl border border-[#d8caab] bg-[#fff5de] p-4 text-[#123a34]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{idea.text}</p>
                    <p className="text-xs uppercase tracking-[0.1em] text-[#2c6a62]">
                      {idea.category} by {idea.author}
                    </p>
                  </div>
                  <button
                    className="rounded-full bg-[#0a9396] px-3 py-2 text-sm font-semibold text-white hover:bg-[#087f82]"
                    onClick={() => handleVote(idea.id)}
                    type="button"
                  >
                    Vote ({idea.votes})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="planner-panel rounded-3xl p-7">
          <h2 className="text-2xl text-[#123a34]">Add Your Idea</h2>
          <form onSubmit={handleAddIdea} className="mt-4 space-y-3">
            <textarea
              className="planner-input min-h-28 w-full rounded-xl px-4 py-3"
              placeholder="Share a place, experience, or plan you want in the trip"
              value={ideaText}
              onChange={(event) => setIdeaText(event.target.value)}
            />
            <select
              className="planner-input w-full rounded-xl px-4 py-3"
              value={category}
              onChange={(event) => setCategory(event.target.value as IdeaCategory)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
            <button className="planner-link w-full rounded-xl px-4 py-3 font-semibold" type="submit">
              Contribute Idea
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[#d8caab] bg-[#fff5de] p-4">
            <h3 className="text-lg font-semibold text-[#123a34]">Set Your Budget</h3>
            <p className="mt-1 text-sm text-[#355952]">
              Add your personal trip budget so AI can suggest realistic options.
            </p>
            <form onSubmit={handleSaveBudget} className="mt-3 flex gap-2">
              <input
                className="planner-input w-full rounded-xl px-3 py-2"
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                inputMode="decimal"
                placeholder="1200"
              />
              <button className="rounded-xl bg-[#0a9396] px-4 py-2 font-semibold text-white" type="submit">
                Save
              </button>
            </form>
            {budgetSummary ? (
              <p className="mt-3 text-sm text-[#355952]">
                {budgetSummary.count} entries. Avg {budgetSummary.currency} {budgetSummary.average}, min {budgetSummary.minimum}, max {budgetSummary.maximum}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-[#355952]">No budgets submitted yet.</p>
            )}
          </div>

          <button
            className="mt-6 w-full rounded-xl bg-[#123a34] px-4 py-3 font-semibold text-white hover:bg-[#0e2d29]"
            type="button"
            onClick={handlePlanTrip}
            disabled={isPlanning}
          >
            {isPlanning ? "Generating Itinerary..." : "Plan My Trip with AI"}
          </button>
        </aside>
      </section>
    </main>
  );
}