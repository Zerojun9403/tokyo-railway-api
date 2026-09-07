import { NextRequest, NextResponse } from "next/server";

import {
  getKeiseiAirportTimetable,
  isKeiseiAirportStation,
  isServiceSupportedAtStation,
  type KeiseiAirportDayType,
} from "@/lib/providers/keiseiAirportProvider";

export const dynamic = "force-dynamic";

const VALID_DAY_TYPES = new Set<KeiseiAirportDayType>(["weekday", "weekend"]);

const DEFAULT_STATION = "narita-airport-terminal-1";

export async function GET(request: NextRequest) {
  try {
    const dayTypeParam =
      request.nextUrl.searchParams.get("dayType") ?? "weekday";

    const stationParam =
      request.nextUrl.searchParams.get("station") ?? DEFAULT_STATION;

    if (!VALID_DAY_TYPES.has(dayTypeParam as KeiseiAirportDayType)) {
      return NextResponse.json(
        {
          error: "Invalid dayType",
          message: 'dayType must be "weekday" or "weekend".',
        },
        { status: 400 },
      );
    }

    if (!isKeiseiAirportStation(stationParam)) {
      return NextResponse.json(
        {
          error: "Invalid station",
          message: "Unsupported Keisei airport timetable station.",
        },
        { status: 400 },
      );
    }

    if (!isServiceSupportedAtStation(stationParam, "sky-access")) {
      return NextResponse.json(
        {
          supported: false,
          found: false,
          error: "Sky Access is not supported at this station.",
        },
        { status: 400 },
      );
    }

    const result = await getKeiseiAirportTimetable(
      "sky-access",
      dayTypeParam as KeiseiAirportDayType,
      stationParam,
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
    console.error("Sky Access timetable API error:", error);

    return NextResponse.json(
      {
        supported: true,
        found: false,
        error: "Failed to fetch Sky Access timetable",
      },
      { status: 500 },
    );
  }
}
