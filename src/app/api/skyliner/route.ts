import { NextRequest, NextResponse } from "next/server";

import {
  getKeiseiAirportTimetable,
  type KeiseiAirportDayType,
} from "@/lib/providers/keiseiAirportProvider";

export const dynamic = "force-dynamic";

const VALID_DAY_TYPES = new Set<KeiseiAirportDayType>(["weekday", "weekend"]);

export async function GET(request: NextRequest) {
  try {
    const dayTypeParam =
      request.nextUrl.searchParams.get("dayType") ?? "weekday";

    if (!VALID_DAY_TYPES.has(dayTypeParam as KeiseiAirportDayType)) {
      return NextResponse.json(
        {
          error: "Invalid dayType",
          message: 'dayType must be "weekday" or "weekend".',
        },
        { status: 400 },
      );
    }

    const result = await getKeiseiAirportTimetable(
      "skyliner",
      dayTypeParam as KeiseiAirportDayType,
    );

    return NextResponse.json(
      {
        supported: true,
        found: result.timetable.length > 0,
        ...result,
        count: result.timetable.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Skyliner timetable API error:", error);

    return NextResponse.json(
      {
        supported: true,
        found: false,
        error: "Failed to fetch Skyliner timetable",
      },
      { status: 500 },
    );
  }
}
