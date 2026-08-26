import { NextRequest, NextResponse } from "next/server";

import { getProvider } from "@/lib/providers/providerRegistry";

import type {
  RailwayOperator,
  TrainResponse,
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

const isRailwayOperator = (
  value: string,
): value is RailwayOperator => {
  return RAILWAY_OPERATORS.includes(
    value as RailwayOperator,
  );
};

export const GET = async (
  request: NextRequest,
) => {
  const searchParams =
    request.nextUrl.searchParams;

  const operator =
    searchParams.get("operator");

  const lineId =
    searchParams.get("lineId");

  const stationId =
    searchParams.get("stationId");

  const directionId =
    searchParams.get("directionId");

  if (
    !operator ||
    !lineId ||
    !stationId ||
    !directionId
  ) {
    return NextResponse.json(
      {
        error: "Missing required parameters",
        required: [
          "operator",
          "lineId",
          "stationId",
          "directionId",
        ],
      },
      {
        status: 400,
      },
    );
  }

  if (!isRailwayOperator(operator)) {
    return NextResponse.json(
      {
        error: "Unsupported railway operator",
        operator,
      },
      {
        status: 400,
      },
    );
  }

  const provider =
    getProvider(operator);

  if (!provider) {
    return NextResponse.json(
      {
        error: "Provider not registered",
        operator,
      },
      {
        status: 501,
      },
    );
  }

  try {
    const trains =
      await provider.getTrains({
        operator,
        lineId,
        stationId,
        directionId,
      });

    const response: TrainResponse = {
      operator,
      lineId,
      stationId,
      directionId,
      updatedAt:
        new Date().toISOString(),
      trains,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "Failed to fetch trains:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to fetch trains",
      },
      {
        status: 500,
      },
    );
  }
};