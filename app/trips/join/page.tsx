"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/app/components/NavBar";
import { getCurrentUser, getTrips, joinTrip } from "@/lib/trips";

export default function JoinTripPage() {
  const [code, setCode] = useState("");
  const [user, setUser] = useState("");
  const [error, setError] = useState("");
  const [discoverableCodes, setDiscoverableCodes] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const found = getCurrentUser();
    if (!found) {
      router.push("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(found);
    setDiscoverableCodes(getTrips().map((trip) => trip.id));
  }, [router]);

  function tryJoin(tripCode: string) {
    const trip = joinTrip(tripCode, user);
    if (!trip) {
      setError("Trip code not found. Check and try again.");
      return;
    }

    router.push(`/trips/${trip.id}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Enter a trip code.");
      return;
    }
    tryJoin(code);
  }

  return (
    <main className="planner-shell">
      <NavBar />
      <section className="mx-auto grid w-full max-w-4xl gap-5 md:grid-cols-2">
        <article className="planner-panel rounded-3xl p-8">
          <h1 className="text-4xl text-[#123a34]">Join an Existing Trip</h1>
          <p className="mt-2 text-[#355952]">Enter a shared code to jump into the planning board.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              className="planner-input w-full rounded-xl px-4 py-3 uppercase"
              placeholder="Trip code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
            <button className="planner-link w-full rounded-xl px-5 py-3 font-semibold" type="submit">
              Join Trip
            </button>
          </form>
        </article>

        <article className="planner-panel rounded-3xl p-8">
          <h2 className="text-2xl text-[#123a34]">Quick Join Codes</h2>
          <p className="mt-2 text-sm text-[#355952]">Demo-friendly list from your current storage.</p>
          <div className="mt-4 space-y-2">
            {discoverableCodes.map((tripCode) => (
              <button
                key={tripCode}
                onClick={() => tryJoin(tripCode)}
                className="w-full rounded-xl border border-[#d6c7a5] bg-[#fff5de] px-4 py-3 text-left font-semibold text-[#17453e] hover:bg-[#f8e8c8]"
                type="button"
              >
                {tripCode}
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}