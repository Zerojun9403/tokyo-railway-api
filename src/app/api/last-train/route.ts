import { NextRequest, NextResponse } from "next/server";

import { normalizeLastTrainRequest } from "@/lib/lastTrain/normalizeLastTrainRequest";
import { getProvider } from "@/lib/providers/providerRegistry";
import type { RailwayOperator, RailwayTimetable } from "@/types/railway";

const RAILWAY_OPERATORS: RailwayOperator[] = [
  "tokyo-metro",
  "toei",
  "jr-east",
  "keisei",
  "keikyu",
  "seibu",
  "tokyu",
];

const LAST_TRAIN_SUPPORTED_OPERATORS: RailwayOperator[] = [
  "tokyo-metro",
  "jr-east",
  "toei",
  "keikyu",
  "seibu",
  "tokyu",
];

/*
 * =========================================================
 * Service Day Time
 * =========================================================
 *
 * 철도 영업일 기준으로 시간을 비교한다.
 *
 * 23:50 -> 1430
 * 00:10 -> 1450
 * 01:00 -> 1500
 *
 * 새벽 03:00 이전 시간은 전날 영업일의 연장으로 취급한다.
 */

const getServiceDayMinutes = (time: string): number => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);

  if (!match) {
    return -1;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return -1;
  }

  const adjustedHour = hour < 3 ? hour + 24 : hour;

  return adjustedHour * 60 + minute;
};

/*
 * =========================================================
 * Find Last Train
 * =========================================================
 */

const findLastTrain = (
  timetable: RailwayTimetable[],
): RailwayTimetable | null => {
  let lastTrain: RailwayTimetable | null = null;
  let lastTrainMinutes = -1;

  for (const item of timetable) {
    const serviceDayMinutes = getServiceDayMinutes(item.departureTime);

    if (serviceDayMinutes < 0) {
      continue;
    }

    if (lastTrain === null || serviceDayMinutes > lastTrainMinutes) {
      lastTrain = item;
      lastTrainMinutes = serviceDayMinutes;
    }
  }

  return lastTrain;
};

/*
 * =========================================================
 * GET /api/last-train
 * =========================================================
 *
 * Required:
 *
 * operator
 * lineId
 * stationId
 * directionId
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const operator = searchParams.get("operator") as RailwayOperator | null;

  const lineId = searchParams.get("lineId");
  const stationId = searchParams.get("stationId");
  const directionId = searchParams.get("directionId");

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

  /*
   * StationTimetable coverage audit 결과 기준.
   *
   * Tokyo Metro / Toei / Keisei는 현재
   * StationTimetable 데이터가 확인되지 않았으므로
   * 막차 기능 지원 대상으로 표시하지 않는다.
   */

  if (!LAST_TRAIN_SUPPORTED_OPERATORS.includes(operator)) {
    return NextResponse.json(
      {
        error: `Last train is not supported for ${operator}`,
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
     * Normalize GUIDE Request
     * =====================================================
     *
     * GUIDE에서 사용하는 lineId / directionId를
     * Provider가 이해하는 값으로 변환한다.
     *
     * 응답에는 GUIDE가 요청한 원본 값을 유지한다.
     */

    const normalized = normalizeLastTrainRequest({
      operator,
      lineId,
      stationId,
      directionId,
    });

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
      operator: normalized.operator,
      lineId: normalized.lineId,
      stationId: normalized.stationId,
      directionId: normalized.directionId,
    });

    /*
     * =====================================================
     * Find Last Train
     * =====================================================
     */

    const lastTrain = findLastTrain(timetable);

    if (!lastTrain) {
      return NextResponse.json(
        {
          operator,
          lineId,
          stationId,
          directionId,

          supported: true,
          found: false,

          updatedAt: new Date().toISOString(),

          lastTrain: null,
        },
        {
          status: 404,
        },
      );
    }

    /*
     * =====================================================
     * Response
     * =====================================================
     *
     * Provider 내부 ID가 아니라
     * GUIDE가 요청한 원래 ID를 반환한다.
     */

    return NextResponse.json({
      operator,
      lineId,
      stationId,
      directionId,

      supported: true,
      found: true,

      updatedAt: new Date().toISOString(),

      lastTrain: {
        id: lastTrain.id,

        departureTime: lastTrain.departureTime,

        trainType: lastTrain.trainType,
        trainTypeKo: lastTrain.trainTypeKo,
        trainTypeJa: lastTrain.trainTypeJa,

        destinationStation: lastTrain.destinationStation,

        destinationKo: lastTrain.destinationKo,

        destinationJa: lastTrain.destinationJa,
      },
    });
  } catch (error) {
    console.error("[Last Train API Error]", error);

    return NextResponse.json(
      {
        error: "Failed to fetch last train",
      },
      {
        status: 500,
      },
    );
  }
}
