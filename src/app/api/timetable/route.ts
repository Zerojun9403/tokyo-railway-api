import { NextRequest, NextResponse } from "next/server";

import { getProvider } from "@/lib/providers/providerRegistry";
import type {
  RailwayOperator,
  RailwayTimetable,
  TimetableResponse,
} from "@/types/railway";

const RAILWAY_OPERATORS: RailwayOperator[] = [
  "tokyo-metro",
  "toei",
  "jr-east",
  "keisei",
  "keikyu",
  "seibu",
  "tokyu",
];

/*
 * =========================================================
 * Japan Current Time
 * =========================================================
 */

const getJapanCurrentTime = (): string => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date());
};

/*
 * =========================================================
 * Upcoming Timetable
 * =========================================================
 */

const filterUpcomingTimetable = (
  timetable: RailwayTimetable[],
): RailwayTimetable[] => {
  const currentTime = getJapanCurrentTime();

  return timetable.filter((item) => item.departureTime >= currentTime);
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const operator = searchParams.get("operator") as RailwayOperator | null;

  const lineId = searchParams.get("lineId");
  const stationId = searchParams.get("stationId");
  const directionId = searchParams.get("directionId");

  /*
   * upcoming=true
   * → 현재 시각 이후 열차만 반환
   */

  const upcoming = searchParams.get("upcoming") === "true";

  /*
   * limit=3
   * → 최대 3개의 시간표만 반환
   */

  const limitParam = searchParams.get("limit");

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  /*
   * =======================================================
   * Validate Parameters
   * =======================================================
   */

  if (!operator || !lineId || !stationId || !directionId) {
    return NextResponse.json(
      {
        error: "operator, lineId, stationId and directionId are required",
      },
      {
        status: 400,
      },
    );
  }

  if (!RAILWAY_OPERATORS.includes(operator)) {
    return NextResponse.json(
      {
        error: "Unsupported operator",
      },
      {
        status: 400,
      },
    );
  }

  try {
    /*
     * =====================================================
     * Provider
     * =====================================================
     */

    const provider = getProvider(operator);

    if (!provider) {
      return NextResponse.json(
        {
          error: `Provider is not available for ${operator}`,
        },
        {
          status: 501,
        },
      );
    }

    if (!provider.getTimetable) {
      return NextResponse.json(
        {
          error: `Timetable is not supported for ${operator}`,
        },
        {
          status: 501,
        },
      );
    }

    /*
     * =====================================================
     * Fetch Timetable
     * =====================================================
     */

    const timetable = await provider.getTimetable({
      operator,
      lineId,
      stationId,
      directionId,
    });

    /*
     * =====================================================
     * Upcoming Filter
     * =====================================================
     */

    const filteredTimetable = upcoming
      ? filterUpcomingTimetable(timetable)
      : timetable;

    /*
     * =====================================================
     * Limit
     * =====================================================
     */

    const limitedTimetable =
      limit !== undefined && Number.isInteger(limit) && limit > 0
        ? filteredTimetable.slice(0, limit)
        : filteredTimetable;

    /*
     * =====================================================
     * Response
     * =====================================================
     */

    const response: TimetableResponse = {
      operator,
      lineId,
      stationId,
      directionId,
      updatedAt: new Date().toISOString(),
      timetable: limitedTimetable,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Timetable API Error]", error);

    return NextResponse.json(
      {
        error: "Failed to fetch timetable",
      },
      {
        status: 500,
      },
    );
  }
}
