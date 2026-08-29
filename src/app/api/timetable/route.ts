import { NextRequest, NextResponse } from "next/server";

import { getProvider } from "@/lib/providers/providerRegistry";
import type { RailwayOperator, TimetableResponse } from "@/types/railway";

const RAILWAY_OPERATORS: RailwayOperator[] = [
  "tokyo-metro",
  "toei",
  "jr-east",
  "keisei",
  "keikyu",
  "seibu",
  "tokyu",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const operator = searchParams.get("operator") as RailwayOperator | null;

  const lineId = searchParams.get("lineId");
  const stationId = searchParams.get("stationId");
  const directionId = searchParams.get("directionId");

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

    const timetable = await provider.getTimetable({
      operator,
      lineId,
      stationId,
      directionId,
    });

    const response: TimetableResponse = {
      operator,
      lineId,
      stationId,
      directionId,
      updatedAt: new Date().toISOString(),
      timetable,
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
