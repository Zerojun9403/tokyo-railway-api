import { NextRequest, NextResponse } from "next/server";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

type OdptStationTimetable = {
  "owl:sameAs"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: unknown[];
};

const getLastSegment = (
  value: string | undefined,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.split(".").pop();
};

export const GET = async (
  request: NextRequest,
) => {
  try {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "ODPT_API_KEY is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    const railway =
      request.nextUrl.searchParams.get("railway");

    if (!railway) {
      return NextResponse.json(
        {
          error: "railway query parameter is required.",
          example:
            "/api/debug/jr-east/station-timetable?railway=Sobu",
        },
        {
          status: 400,
        },
      );
    }

    const odptRailway =
      `odpt.Railway:JR-East.${railway}`;

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:JR-East",
    );

    url.searchParams.set(
      "odpt:railway",
      odptRailway,
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "JR East StationTimetable request failed.",
          railway: odptRailway,
          status: response.status,
          statusText: response.statusText,
        },
        {
          status: response.status,
        },
      );
    }

    const data =
      (await response.json()) as OdptStationTimetable[];

    const combinations = data.map(
  (timetable) => ({
    station: getLastSegment(
      timetable["odpt:station"],
    ),
    rawStation: timetable["odpt:station"],
    direction: getLastSegment(
      timetable["odpt:railDirection"],
    ),
    rawDirection:
      timetable["odpt:railDirection"],
    calendar: getLastSegment(
      timetable["odpt:calendar"],
    ),
    timetableCount:
      timetable[
        "odpt:stationTimetableObject"
      ]?.length ?? 0,
  }),
);
    

    const stations = Array.from(
      new Set(
        combinations
          .map((item) => item.station)
          .filter(
            (station): station is string =>
              Boolean(station),
          ),
      ),
    );

    const directions = Array.from(
      new Set(
        combinations
          .map((item) => item.direction)
          .filter(
            (direction): direction is string =>
              Boolean(direction),
          ),
      ),
    );

    const calendars = Array.from(
      new Set(
        combinations
          .map((item) => item.calendar)
          .filter(
            (calendar): calendar is string =>
              Boolean(calendar),
          ),
      ),
    );

    return NextResponse.json({
      requestedRailway: railway,
      odptRailway,
      totalStationTimetables: data.length,
      stations,
      directions,
      calendars,
      combinations,
    });
  } catch (error) {
    console.error(
      "[JR East StationTimetable Debug API]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
};