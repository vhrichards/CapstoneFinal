import OpenAI from "openai";
import { NextResponse } from "next/server";
import { PlannedDay, Trip } from "@/lib/trips";

type ItineraryResponse = {
  summary: string;
  days: PlannedDay[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { trip?: Trip };
    const trip = body.trip;

    if (!trip) {
      return NextResponse.json({ error: "Trip payload is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add it to your environment to enable AI itinerary generation.",
        },
        { status: 500 },
      );
    }

    const client = new OpenAI({ apiKey });
    const rankedIdeas = [...trip.ideas].sort((a, b) => b.votes - a.votes);
    const topIdeas = rankedIdeas.slice(0, 6);
    const budgetText =
      trip.budgets && trip.budgets.length > 0
        ? trip.budgets
            .map((entry) => `${entry.user}: ${entry.currency} ${entry.amount}`)
            .join(", ")
        : "No explicit budgets submitted yet.";

    const prompt = `You are an expert group travel planner. Build a practical, fun 3-day itinerary in strict JSON.

Trip details:
- Trip name: ${trip.title}
- Destination: ${trip.destination}
- Start date: ${trip.startDate}
- Theme: ${trip.theme}
- Members: ${trip.members.join(", ")}
- Budget inputs: ${budgetText}

Ranked preferences (higher votes first):
${topIdeas
  .map((idea, index) => `${index + 1}. [${idea.category}] ${idea.text} (votes: ${idea.votes}, author: ${idea.author})`)
  .join("\n")}

Return ONLY valid JSON with this exact shape:
{
  "summary": "short paragraph",
  "days": [
    {
      "day": 1,
      "headline": "string",
      "stops": [
        { "time": "09:00", "title": "string", "details": "string" },
        { "time": "13:00", "title": "string", "details": "string" },
        { "time": "19:00", "title": "string", "details": "string" }
      ]
    }
  ]
}

Rules:
- Exactly 3 days.
- Exactly 3 stops per day.
- Keep recommendations realistic for destination and group preferences.
- Respect budget constraints and suggest cost-aware activities.
- Vary activities so itinerary is not repetitive.
- Do not include markdown fences or extra commentary.`;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.8,
      max_output_tokens: 1400,
    });

    const outputText = completion.output_text?.trim();
    if (!outputText) {
      return NextResponse.json({ error: "Model returned empty output." }, { status: 502 });
    }

    let parsed: ItineraryResponse;
    try {
      parsed = JSON.parse(outputText) as ItineraryResponse;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse model output as JSON.", rawOutput: outputText },
        { status: 502 },
      );
    }

    const days = normalizeDays(parsed.days);
    if (!parsed.summary || days.length !== 3) {
      return NextResponse.json(
        { error: "Model output did not match required itinerary format.", rawOutput: outputText },
        { status: 502 },
      );
    }

    return NextResponse.json({
      plan: {
        generatedAt: new Date().toISOString(),
        summary: parsed.summary,
        days,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeDays(days: PlannedDay[] | undefined): PlannedDay[] {
  if (!Array.isArray(days)) {
    return [];
  }

  return days.slice(0, 3).map((day, index) => {
    const normalizedStops = Array.isArray(day.stops) ? day.stops.slice(0, 3) : [];
    return {
      day: index + 1,
      headline: String(day.headline ?? `Day ${index + 1}`),
      stops: normalizedStops.map((stop, stopIndex) => ({
        time: String(stop.time ?? fallbackTime(stopIndex)),
        title: String(stop.title ?? "Planned activity"),
        details: String(stop.details ?? "Enjoy this part of your trip."),
      })),
    };
  });
}

function fallbackTime(index: number): string {
  if (index === 0) {
    return "09:00";
  }
  if (index === 1) {
    return "13:00";
  }
  return "19:00";
}
