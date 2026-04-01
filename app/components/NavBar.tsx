"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearCurrentUser } from "@/lib/trips";

const links = [
  { href: "/home", label: "Home" },
  { href: "/trips/create", label: "Create Trip" },
  { href: "/trips/join", label: "Join Trip" },
  { href: "/trips/saved", label: "Saved Trips" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="planner-panel mx-auto mb-6 flex w-full max-w-6xl flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
      <Link href="/home" className="text-lg font-bold tracking-wide text-[#083f49]">
        PlannerMVP
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-[#083f49] text-white"
                  : "bg-[#f3e7cd] text-[#083f49] hover:bg-[#e5d6b4]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          onClick={() => {
            clearCurrentUser();
            router.push("/login");
          }}
          className="rounded-full border border-[#c7b48f] bg-white px-4 py-2 text-sm font-semibold text-[#7b2b20] hover:bg-[#fce8df]"
          type="button"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}