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
  plan?: TripPlan;
};

const TRIPS_STORAGE_KEY = "plannerMvp.trips";
const USER_STORAGE_KEY = "plannerMvp.currentUser";

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
    return parsed;
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

export function seedTrips(): Trip[] {
  return [
    {
      id: "TOKYO88",
      title: "Neon + Noodles",
      destination: "Tokyo, Japan",
      startDate: "2026-07-08",
      theme: "Street food and late-night city energy",
      members: ["Maya", "Jordan"],
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