import { NextRequest, NextResponse } from "next/server";

import { findLastTrain } from "@/lib/lastTrain/findLastTrain";
import { normalizeLastTrainRequest } from "@/lib/lastTrain/normalizeLastTrainRequest";
import { STATION_LAST_TRAIN_REGISTRY } from "@/lib/lastTrain/stationLineRegistry";
import { getProvider } from "@/lib/providers/providerRegistry";

/*
 * =========================================================
 * GET /api/station-last-train
 * =========================================================
 *
 * Example:
 *
 * /api/station-last-train?station=shinjuku
 *
 * station
 *   → line
 *   → direction
 *   → verified timetable
 *   → last train
 *
 * 한 노선/방향 조회가 실패해도
 * 다른 노선의 결과는 계속 수집한다.
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const stationKey = searchParams.get("station")?.trim().toLowerCase();

  /*
   * =======================================================
   * Validate
   * =======================================================
   */

  if (!stationKey) {
    return NextResponse.json(
      {
        error: "station is required",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * =======================================================
   * Find Station
   * =======================================================
   */

  const station = STATION_LAST_TRAIN_REGISTRY.find(
    (item) => item.stationKey === stationKey,
  );

  if (!station) {
    return NextResponse.json(
      {
        error: `Station is not registered: ${stationKey}`,
      },
      {
        status: 404,
      },
    );
  }

  /*
   * =======================================================
   * Collect Last Trains
   * =======================================================
   */

  const lines = await Promise.all(
    station.lines.map(async (line) => {
      const directions = await Promise.all(
        line.directions.map(async (direction) => {
          try {
            /*
             * GUIDE-facing IDs
             * → Provider-facing IDs
             */

            const normalized = normalizeLastTrainRequest({
              operator: line.operator,
              lineId: line.lineId,
              stationId: line.stationId,
              directionId: direction.directionId,
            });

            const provider = getProvider(line.operator);

            if (!provider?.getTimetable) {
              return {
                directionId: direction.directionId,
                directionKo: direction.directionKo,
                directionJa: direction.directionJa,

                supported: false,
                found: false,

                lastTrain: null,
              };
            }

            /*
             * =================================================
             * Verified Timetable
             * =================================================
             */

            const timetable = await provider.getTimetable({
              operator: normalized.operator,
              lineId: normalized.lineId,
              stationId: normalized.stationId,
              directionId: normalized.directionId,
            });

            const lastTrain = findLastTrain(timetable);

            if (!lastTrain) {
              return {
                directionId: direction.directionId,
                directionKo: direction.directionKo,
                directionJa: direction.directionJa,

                supported: true,
                found: false,

                lastTrain: null,
              };
            }

            return {
              directionId: direction.directionId,
              directionKo: direction.directionKo,
              directionJa: direction.directionJa,

              supported: true,
              found: true,

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
            };
          } catch (error) {
            console.error(
              `[Station Last Train Error] ${line.operator} ${line.lineId} ${direction.directionId}`,
              error,
            );

            /*
             * 한 방향이 실패해도
             * 역 전체 조회를 실패시키지 않는다.
             */

            return {
              directionId: direction.directionId,
              directionKo: direction.directionKo,
              directionJa: direction.directionJa,

              supported: true,
              found: false,

              lastTrain: null,
            };
          }
        }),
      );

      return {
        operator: line.operator,

        lineId: line.lineId,
        lineNameKo: line.lineNameKo,
        lineNameJa: line.lineNameJa,

        stationId: line.stationId,

        directions,
      };
    }),
  );

  /*
   * =======================================================
   * Response
   * =======================================================
   */

  return NextResponse.json({
    station: {
      stationKey: station.stationKey,

      nameKo: station.nameKo,
      nameJa: station.nameJa,
      nameEn: station.nameEn,
    },

    updatedAt: new Date().toISOString(),

    lines,
  });
}