export type IdeaCategory =
  | "Stay"
  | "Food"
  | "Adventure"
  | "Culture"
  | "Nightlife"
  | "Nature";

export type TripIdea = {
  id: string;
  text: string;
  category: IdeaCategory;
  votes: number;
  author: string;
};

export type BudgetContribution = {
  user: string;
  amount: number;
  currency: string;
  updatedAt: string;
};

export type PlannedStop = {
  time: string;
  title: string;
  details: string;
};

export type PlannedDay = {
  day: number;
  headline: string;
  stops: PlannedStop[];
};

export type TripPlan = {
  generatedAt: string;
  summary: string;
  days: PlannedDay[];
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  theme: string;
  members: string[];
  ideas: TripIdea[];
  budgets: BudgetContribution[];
  plan?: TripPlan;
};

const TRIPS_STORAGE_KEY = "plannerMvp.trips";
const USER_STORAGE_KEY = "plannerMvp.currentUser";
const ACCOUNTS_STORAGE_KEY = "plannerMvp.accounts";

type LocalAccount = {
  username: string;
  password: string;
  createdAt: string;
};

function browserOnlyError(): never {
  throw new Error("This utility should only run in the browser.");
}

function readTripsFromStorage(): Trip[] {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  const raw = window.localStorage.getItem(TRIPS_STORAGE_KEY);
  if (!raw) {
    const seeded = seedTrips();
    window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Trip[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = seedTrips();
      window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const normalized = parsed.map(normalizeTrip);
    window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const seeded = seedTrips();
    window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeTripsToStorage(trips: Trip[]): void {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

function readAccountsFromStorage(): LocalAccount[] {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LocalAccount[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((account) => {
        const legacyName = (account as { name?: unknown }).name;
        const username =
          typeof account?.username === "string"
            ? account.username
            : typeof legacyName === "string"
              ? legacyName
              : "";

        return {
          username: username.trim(),
          password: typeof account?.password === "string" ? account.password : "",
          createdAt:
            typeof account?.createdAt === "string" ? account.createdAt : new Date().toISOString(),
        } satisfies LocalAccount;
      })
      .filter((account) => account.username.length > 0 && account.password.length > 0);
  } catch {
    return [];
  }
}

function writeAccountsToStorage(accounts: LocalAccount[]): void {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function seedTrips(): Trip[] {
  return [
    {
      id: "TOKYO88",
      title: "Neon + Noodles",
      destination: "Tokyo, Japan",
      startDate: "2026-07-08",
      theme: "Street food and late-night city energy",
      members: ["Maya", "Jordan"],
      budgets: [
        {
          user: "Maya",
          amount: 1600,
          currency: "USD",
          updatedAt: new Date("2026-03-01").toISOString(),
        },
        {
          user: "Jordan",
          amount: 1900,
          currency: "USD",
          updatedAt: new Date("2026-03-03").toISOString(),
        },
      ],
      ideas: [
        {
          id: "idea-1",
          text: "Shibuya food crawl with tiny ramen spots",
          category: "Food",
          votes: 6,
          author: "Maya",
        },
        {
          id: "idea-2",
          text: "Spend one full day in teamLab Planets and Odaiba",
          category: "Culture",
          votes: 4,
          author: "Jordan",
        },
      ],
    },
    {
      id: "ALPS22",
      title: "Mountain Reset",
      destination: "Banff, Canada",
      startDate: "2026-09-12",
      theme: "Scenic hiking and lakeside chill",
      members: ["Ari", "Dev"],
      budgets: [
        {
          user: "Ari",
          amount: 1200,
          currency: "USD",
          updatedAt: new Date("2026-02-21").toISOString(),
        },
      ],
      ideas: [
        {
          id: "idea-3",
          text: "Sunrise at Moraine Lake with picnic breakfast",
          category: "Nature",
          votes: 8,
          author: "Ari",
        },
        {
          id: "idea-4",
          text: "Book cabins with firepit for nightly hangouts",
          category: "Stay",
          votes: 5,
          author: "Dev",
        },
      ],
    },
  ];
}

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  const user = window.localStorage.getItem(USER_STORAGE_KEY);
  return user ? user.trim() : null;
}

export function setCurrentUser(name: string): void {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  window.localStorage.setItem(USER_STORAGE_KEY, name.trim());
}

export function clearCurrentUser(): void {
  if (typeof window === "undefined") {
    return browserOnlyError();
  }

  window.localStorage.removeItem(USER_STORAGE_KEY);
}

export function signUpLocalAccount(input: {
  username: string;
  password: string;
}): { ok: true } | { ok: false; message: string } {
  const username = input.username.trim();
  const password = input.password.trim();

  if (username.length < 2) {
    return { ok: false, message: "Enter at least 2 characters for your username." };
  }

  if (password.length < 6) {
    return { ok: false, message: "Use a password with at least 6 characters." };
  }

  const accounts = readAccountsFromStorage();
  const exists = accounts.some(
    (account) => account.username.toLowerCase() === username.toLowerCase(),
  );

  if (exists) {
    return { ok: false, message: "An account with that username already exists. Please log in." };
  }

  accounts.push({
    username,
    password,
    createdAt: new Date().toISOString(),
  });

  writeAccountsToStorage(accounts);
  setCurrentUser(username);
  return { ok: true };
}

export function loginLocalAccount(input: {
  username: string;
  password: string;
}): { ok: true } | { ok: false; message: string } {
  const username = input.username.trim();
  const password = input.password.trim();
  const accounts = readAccountsFromStorage();

  if (accounts.length === 0) {
    return { ok: false, message: "No accounts found yet. Please create an account first." };
  }

  const account = accounts.find(
    (item) => item.username.toLowerCase() === username.toLowerCase(),
  );
  if (!account) {
    return { ok: false, message: "Account not found. Check your username or create an account." };
  }

  if (account.password !== password) {
    return { ok: false, message: "Incorrect password. Please try again." };
  }

  setCurrentUser(account.username);
  return { ok: true };
}

export function getTrips(): Trip[] {
  return readTripsFromStorage();
}

export function getTripById(tripId: string): Trip | undefined {
  return readTripsFromStorage().find((trip) => trip.id === normalizeTripCode(tripId));
}

export function createTrip(input: {
  title: string;
  destination: string;
  startDate: string;
  theme: string;
  creator: string;
}): Trip {
  const trips = readTripsFromStorage();
  const trip: Trip = {
    id: generateTripCode(input.title),
    title: input.title,
    destination: input.destination,
    startDate: input.startDate,
    theme: input.theme,
    members: [input.creator],
    budgets: [],
    ideas: [
      {
        id: crypto.randomUUID(),
        text: `Kickoff dinner picked by ${input.creator}`,
        category: "Food",
        votes: 1,
        author: input.creator,
      },
    ],
  };

  trips.unshift(trip);
  writeTripsToStorage(trips);
  return trip;
}

export function joinTrip(tripCode: string, user: string): Trip | null {
  const normalized = normalizeTripCode(tripCode);
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalized);

  if (!trip) {
    return null;
  }

  if (!trip.members.includes(user)) {
    trip.members.push(user);
  }

  writeTripsToStorage(trips);
  return trip;
}

export function addIdeaToTrip(input: {
  tripId: string;
  text: string;
  category: IdeaCategory;
  author: string;
}): Trip | null {
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalizeTripCode(input.tripId));
  if (!trip) {
    return null;
  }

  trip.ideas.push({
    id: crypto.randomUUID(),
    text: input.text,
    category: input.category,
    votes: 0,
    author: input.author,
  });

  writeTripsToStorage(trips);
  return trip;
}

export function voteForIdea(tripId: string, ideaId: string): Trip | null {
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalizeTripCode(tripId));
  if (!trip) {
    return null;
  }

  const idea = trip.ideas.find((item) => item.id === ideaId);
  if (!idea) {
    return null;
  }

  idea.votes += 1;
  writeTripsToStorage(trips);
  return trip;
}

export function saveTripPlan(tripId: string, plan: TripPlan): Trip | null {
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalizeTripCode(tripId));
  if (!trip) {
    return null;
  }

  trip.plan = plan;
  writeTripsToStorage(trips);
  return trip;
}

export function addBudgetToTrip(input: {
  tripId: string;
  user: string;
  amount: number;
  currency?: string;
}): Trip | null {
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalizeTripCode(input.tripId));
  if (!trip) {
    return null;
  }

  const currency = (input.currency ?? "USD").toUpperCase();
  const existing = trip.budgets.find((entry) => entry.user === input.user);

  if (existing) {
    existing.amount = input.amount;
    existing.currency = currency;
    existing.updatedAt = new Date().toISOString();
  } else {
    trip.budgets.push({
      user: input.user,
      amount: input.amount,
      currency,
      updatedAt: new Date().toISOString(),
    });
  }

  writeTripsToStorage(trips);
  return trip;
}

export function generateTripPlan(tripId: string): Trip | null {
  const trips = readTripsFromStorage();
  const trip = trips.find((item) => item.id === normalizeTripCode(tripId));
  if (!trip) {
    return null;
  }

  const sortedIdeas = [...trip.ideas].sort((a, b) => b.votes - a.votes);
  const topIdeas = sortedIdeas.slice(0, 4);
  const safeIdeas = topIdeas.length > 0 ? topIdeas : trip.ideas.slice(0, 1);

  const days: PlannedDay[] = [1, 2, 3].map((dayNumber, index) => {
    const pick = safeIdeas[index % safeIdeas.length];
    return {
      day: dayNumber,
      headline: `Day ${dayNumber}: ${pick?.category ?? "Explore"} Focus`,
      stops: [
        {
          time: "09:00",
          title: `Morning around ${trip.destination}`,
          details: `Start with a low-stress walk and coffee while the group aligns on the day.`,
        },
        {
          time: "13:00",
          title: pick?.text ?? "Group activity block",
          details: `Built from your highest-voted preference to maximize group satisfaction.`,
        },
        {
          time: "19:00",
          title: "Evening regroup",
          details: `Dinner + ratings check-in so tomorrow can be adjusted quickly.`,
        },
      ],
    };
  });

  trip.plan = {
    generatedAt: new Date().toISOString(),
    summary: `This itinerary prioritizes ${safeIdeas
      .map((idea) => idea.category.toLowerCase())
      .join(", ")} preferences based on group voting.`,
    days,
  };

  writeTripsToStorage(trips);
  return trip;
}

function normalizeTripCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateTripCode(title: string): string {
  const slug = title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .join("")
    .slice(0, 5)
    .toUpperCase()
    .padEnd(5, "X");
  const random = Math.floor(Math.random() * 90 + 10).toString();
  return `${slug}${random}`;
}

function normalizeTrip(trip: Trip): Trip {
  return {
    ...trip,
    budgets: Array.isArray(trip.budgets) ? trip.budgets : [],
  };
}