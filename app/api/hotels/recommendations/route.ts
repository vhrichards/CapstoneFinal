import { NextResponse } from "next/server";

type HotelsRequest = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  budget?: {
    min?: number;
    max?: number;
    average?: number;
    currency?: string;
  };
};

type HotelRecommendation = {
  id: string;
  name: string;
  neighborhood: string;
  nightlyPrice: number | null;
  currency: string;
  rating: number | null;
  bookingUrl: string | null;
};

type HotelResponse = {
  hotels: HotelRecommendation[];
  source: "local";
  note?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HotelsRequest;

    if (!body.destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    const localHotels = buildLocalHotels(body);
    return NextResponse.json({
      hotels: localHotels,
      source: "local",
      note: "Showing local budget-aware hotel recommendations.",
    } satisfies HotelResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown hotel recommendation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildLocalHotels(input: HotelsRequest): HotelRecommendation[] {
  const destination = input.destination ?? "your destination";
  const currency = input.budget?.currency ?? "USD";
  const target = Math.max(60, Math.round((input.budget?.average ?? 320) / 4));

  const bands = [0.7, 0.95, 1.05, 1.25, 1.5, 1.8];
  const names = [
    "City Central Hotel",
    "Riverside Suites",
    "Market District Stay",
    "Boutique Garden Inn",
    "Skyline Residence",
    "Local Heritage Hotel",
  ];

  return bands.map((multiplier, index) => ({
    id: `fallback-${index + 1}`,
    name: `${destination.split(",")[0]} ${names[index]}`,
    neighborhood: `${destination} area`,
    nightlyPrice: Math.round(target * multiplier),
    currency,
    rating: Number((4 + ((index % 3) * 0.2)).toFixed(1)),
    bookingUrl: null,
  }));
}
