import { NextRequest, NextResponse } from "next/server";

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const OPERATOR_MAP: Record<string, string> = {
  "jr-east": "odpt.Operator:JR-East",
  keikyu: "odpt.Operator:Keikyu",
  seibu: "odpt.Operator:Seibu",
  tokyu: "odpt.Operator:Tokyu",
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
};

type OdptStationTimetable = {
  "@id"?: string;
  "owl:sameAs"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:calendar"?: string;
  "odpt:railDirection"?: string;
  "odpt:stationTimetableObject"?: OdptStationTimetableObject[];
};

const getLastSegment = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const segments = value.split(".");
  return segments[segments.length - 1] ?? null;
};

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "ODPT_API_KEY is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    const { searchParams } = new URL(request.url);

    const operator = searchParams.get("operator")?.trim();
    const railway = searchParams.get("railway")?.trim();

    if (!operator || !railway) {
      return NextResponse.json(
        {
          ok: false,
          error: "operator and railway are required.",
          example:
            "/api/debug/station-timetable-audit?operator=jr-east&railway=odpt.Railway:JR-East.Yamanote",
        },
        {
          status: 400,
        },
      );
    }

    const odptOperator = OPERATOR_MAP[operator];

    if (!odptOperator) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported operator: ${operator}`,
          supportedOperators: Object.keys(OPERATOR_MAP),
        },
        {
          status: 400,
        },
      );
    }

    if (!railway.startsWith("odpt.Railway:")) {
      return NextResponse.json(
        {
          ok: false,
          error: "railway must be a full ODPT railway ID.",
          received: railway,
        },
        {
          status: 400,
        },
      );
    }

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:StationTimetable`);

    url.searchParams.set("odpt:operator", odptOperator);
    url.searchParams.set("odpt:railway", railway);
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("[Station Timetable Audit] ODPT request failed", {
        operator,
        railway,
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });

      return NextResponse.json(
        {
          ok: false,
          operator,
          railway,
          odptStatus: response.status,
          odptStatusText: response.statusText,
          error: errorBody,
        },
        {
          status: response.status,
        },
      );
    }

    const data = (await response.json()) as OdptStationTimetable[];

    const directions = Array.from(
      new Set(
        data
          .map((item) => item["odpt:railDirection"])
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();

    const calendars = Array.from(
      new Set(
        data
          .map((item) => item["odpt:calendar"])
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();

    const stations = Array.from(
      new Set(
        data
          .map((item) => item["odpt:station"])
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort();

    const timetableEntries = data.reduce((total, item) => {
      return total + (item["odpt:stationTimetableObject"]?.length ?? 0);
    }, 0);

    const directionExamples = directions.map((direction) => {
      const timetable = data.find(
        (item) => item["odpt:railDirection"] === direction,
      );

      const firstEntry = timetable?.["odpt:stationTimetableObject"]?.find(
        (item) => Boolean(item["odpt:departureTime"]),
      );

      return {
        direction,
        directionId: getLastSegment(direction),

        station: timetable?.["odpt:station"] ?? null,
        stationId: getLastSegment(timetable?.["odpt:station"]),

        calendar: timetable?.["odpt:calendar"] ?? null,
        calendarId: getLastSegment(timetable?.["odpt:calendar"]),

        firstDeparture: firstEntry?.["odpt:departureTime"] ?? null,

        trainType: firstEntry?.["odpt:trainType"] ?? null,
        trainTypeId: getLastSegment(firstEntry?.["odpt:trainType"]),

        destination: firstEntry?.["odpt:destinationStation"]?.[0] ?? null,

        destinationId: getLastSegment(
          firstEntry?.["odpt:destinationStation"]?.[0],
        ),
      };
    });

    const stationSamples = stations.slice(0, 10).map((station) => ({
      station,
      stationId: getLastSegment(station),
    }));

    return NextResponse.json({
      ok: true,

      operator,
      odptOperator,
      railway,

      summary: {
        timetableRecords: data.length,
        timetableEntries,
        stationCount: stations.length,
        directionCount: directions.length,
        calendarCount: calendars.length,
      },

      directions: directions.map((direction) => ({
        full: direction,
        id: getLastSegment(direction),
      })),

      calendars: calendars.map((calendar) => ({
        full: calendar,
        id: getLastSegment(calendar),
      })),

      directionExamples,

      stationSamples,
    });
  } catch (error) {
    console.error("[Station Timetable Audit] Unexpected error", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown station timetable audit error.",
      },
      {
        status: 500,
      },
    );
  }
}
