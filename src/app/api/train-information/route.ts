import { NextRequest, NextResponse } from "next/server";

import { getProvider } from "@/lib/providers/providerRegistry";
import type { RailwayOperator } from "@/types/railway";

const RAILWAY_OPERATORS: RailwayOperator[] = [
  "tokyo-metro",
  "toei",
  "jr-east",
  "keisei",
  "keikyu",
  "seibu",
  "tokyu",
];

const TRAIN_INFORMATION_SUPPORTED_OPERATORS: RailwayOperator[] = [
  "jr-east",
   "tokyo-metro",
   "toei",
];

/*
 * =========================================================
 * GET /api/train-information
 * =========================================================
 *
 * Required:
 *
 * operator
 * lineId
 *
 * Example:
 *
 * /api/train-information?operator=jr-east&lineId=yamanote
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const operator =
    searchParams.get("operator") as RailwayOperator | null;

  const lineId = searchParams.get("lineId");

  /*
   * =======================================================
   * Validate Parameters
   * =======================================================
   */

  if (!operator || !lineId) {
    return NextResponse.json(
      {
        error: "operator and lineId are required",
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

  /*
   * 현재는 JR East부터 운행정보를 지원한다.
   *
   * 다른 회사는 Provider 구현 및 실제 데이터 검증이
   * 완료된 뒤 순차적으로 추가한다.
   */

  if (!TRAIN_INFORMATION_SUPPORTED_OPERATORS.includes(operator)) {
    return NextResponse.json(
      {
        error: `Train information is not supported for ${operator}`,
        supported: false,
      },
      {
        status: 501,
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

    if (!provider.getTrainInformation) {
      return NextResponse.json(
        {
          error: `Train information is not supported for ${operator}`,
          supported: false,
        },
        {
          status: 501,
        },
      );
    }

    /*
     * =====================================================
     * Fetch Train Information
     * =====================================================
     */

    const information =
      await provider.getTrainInformation({
        operator,
        lineId,
      });

    /*
     * =====================================================
     * Response
     * =====================================================
     */

    return NextResponse.json({
      operator,
      lineId,

      supported: true,
      found: information.length > 0,

      updatedAt: new Date().toISOString(),

      information,
    });
  } catch (error) {
    console.error("[Train Information API Error]", {
      operator,
      lineId,
      error,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch train information",
      },
      {
        status: 500,
      },
    );
  }
}