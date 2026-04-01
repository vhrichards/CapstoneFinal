"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentUser } from "@/lib/trips";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) {
      setError("Enter at least 2 characters for your name.");
      return;
    }

    if (password.trim().length < 4) {
      setError("Use any password with 4+ characters for this demo login.");
      return;
    }

    setCurrentUser(name.trim());
    router.push("/home");
  }

  return (
    <main className="planner-shell flex items-center justify-center">
      <section className="planner-panel w-full max-w-md rounded-3xl p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#0a9396]">
          PlannerMVP
        </p>
        <h1 className="mb-2 text-4xl text-[#153834]">Start Planning Together</h1>
        <p className="mb-6 text-sm text-[#355952]">
          Sign in to build group trips, collect votes, and generate an itinerary in minutes.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm font-semibold text-[#173e38]">
            Name
            <input
              className="planner-input w-full rounded-xl px-3 py-2"
              placeholder="Taylor"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold text-[#173e38]">
            Password
            <input
              className="planner-input w-full rounded-xl px-3 py-2"
              placeholder="Any 4+ characters"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
          <button
            className="planner-link w-full rounded-xl px-4 py-3 text-sm font-semibold"
            type="submit"
          >
            Login
          </button>
        </form>
      </section>
    </main>
  );
}