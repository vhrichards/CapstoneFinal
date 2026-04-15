"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginLocalAccount, signUpLocalAccount } from "@/lib/trips";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password.trim() !== confirmPassword.trim()) {
        setError("Passwords do not match.");
        return;
      }

      const result = signUpLocalAccount({ username, password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
    } else {
      const result = loginLocalAccount({ username, password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
    }

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
          {mode === "signup"
            ? "Create an account to start building and collaborating on trips."
            : "Sign in to build group trips, collect votes, and generate an itinerary in minutes."}
        </p>
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-[#f8ecd5] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-[#0a9396] text-white" : "text-[#355952] hover:bg-[#e8dbc0]"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "signup" ? "bg-[#0a9396] text-white" : "text-[#355952] hover:bg-[#e8dbc0]"
            }`}
          >
            Sign Up
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm font-semibold text-[#173e38]">
            Username
            <input
              className="planner-input w-full rounded-xl px-3 py-2"
              placeholder="taylor_ross"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold text-[#173e38]">
            Password
            <input
              className="planner-input w-full rounded-xl px-3 py-2"
              placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === "signup" && (
            <label className="block space-y-2 text-sm font-semibold text-[#173e38]">
              Confirm Password
              <input
                className="planner-input w-full rounded-xl px-3 py-2"
                placeholder="Re-enter your password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          )}
          {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}
          <button
            className="planner-link w-full rounded-xl px-4 py-3 text-sm font-semibold"
            type="submit"
          >
            {mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>
      </section>
    </main>
  );
}