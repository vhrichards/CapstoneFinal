import { NextResponse } from "next/server";
import { verifyDbConnection } from "@/lib/db";

export async function GET() {
  try {
    const row = await verifyDbConnection();

    return NextResponse.json({
      ok: true,
      message: "Supabase database connected successfully.",
      serverTime: row.now,
      database: row.database_name,
      user: row.current_user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Supabase error";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
