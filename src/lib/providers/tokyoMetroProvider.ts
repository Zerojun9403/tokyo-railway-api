import type { RailwayTimetable } from "@/types/railway";
import type { RailwayProvider } from "./types";

/*
 * =========================================================
 * Tokyo Metro ODPT Center API
 * =========================================================
 *
 * Tokyo Metro StationTimetable은 기존 Challenge API가 아니라
 * ODPT Center API를 사용한다.
 *
 * 기존 JR / Keikyu / Seibu / Tokyu provider는 변경하지 않는다.
 */

const ODPT_API_BASE_URL = "https://api.odpt.org/api/v4";

/*
 * =========================================================
 * Tokyo Metro Railway
 * =========================================================
 *
 * 우선 치요다선부터 막차 API를 연결한다.
 * 다른 Tokyo Metro 노선은 실제 GUIDE directionId와
 * ODPT RailDirection을 확인한 뒤 추가한다.
 */

const railwayMap: Record<string, string> = {
  chiyoda: "odpt.Railway:TokyoMetro.Chiyoda",
};

/*
 * =========================================================
 * Chiyoda Station
 * =========================================================
 *
 * GUIDE stationId -> ODPT station ID
 *
 * C01 YoyogiUehara
 * C20 KitaAyase
 */

const chiyodaStationMap: Record<string, string> = {
  C01: "YoyogiUehara",
  C02: "YoyogiKoen",
  C03: "MeijiJingumae",
  C04: "OmoteSando",
  C05: "Nogizaka",
  C06: "Akasaka",
  C07: "KokkaiGijidomae",
  C08: "Kasumigaseki",
  C09: "Hibiya",
  C10: "Nijubashimae",
  C11: "Otemachi",
  C12: "ShinOchanomizu",
  C13: "Yushima",
  C14: "Nezu",
  C15: "Sendagi",
  C16: "NishiNippori",
  C17: "Machiya",
  C18: "KitaSenju",
  C19: "Ayase",
  C20: "KitaAyase",
};

/*
 * =========================================================
 * Chiyoda Rail Direction
 * =========================================================
 *
 * GUIDE:
 * yoyogiuehara
 * kitaayase
 *
 * ODPT:
 * odpt.RailDirection:TokyoMetro.YoyogiUehara
 * odpt.RailDirection:TokyoMetro.KitaAyase
 */

const chiyodaDirectionMap: Record<string, string> = {
  yoyogiuehara: "TokyoMetro.YoyogiUehara",
  kitaayase: "TokyoMetro.KitaAyase",
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:trainNumber"?: string;
  "odpt:isLast"?: boolean;
};

type OdptStationTimetable = {
  "owl:sameAs"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:calendar"?: string;
  "odpt:railDirection"?: string;
  "odpt:stationTimetableObject"?: OdptStationTimetableObject[];
};

/*
 * =========================================================
 * Helpers
 * =========================================================
 */

const getLastSegment = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const segments = value.split(".");
  return segments[segments.length - 1];
};

const getCalendar = (): "Weekday" | "SaturdayHoliday" => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  });

  const weekday = formatter.format(now);

  if (weekday === "Sat" || weekday === "Sun") {
    return "SaturdayHoliday";
  }

  return "Weekday";
};

const getStationName = (
  lineId: string,
  stationId: string,
): string => {
  if (lineId === "chiyoda") {
    const stationName = chiyodaStationMap[stationId];

    if (!stationName) {
      throw new Error(
        `Unsupported Tokyo Metro Chiyoda stationId: ${stationId}`,
      );
    }

    return stationName;
  }

  throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
};

const getRailDirection = (
  lineId: string,
  directionId: string,
): string => {
  if (lineId === "chiyoda") {
    const direction = chiyodaDirectionMap[directionId];

    if (!direction) {
      throw new Error(
        `Unsupported Tokyo Metro Chiyoda directionId: ${directionId}`,
      );
    }

    return direction;
  }

  throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
};

/*
 * =========================================================
 * Provider
 * =========================================================
 */

export const tokyoMetroProvider: RailwayProvider = {
  operator: "tokyo-metro",

  /*
   * =======================================================
   * Trains
   * =======================================================
   *
   * 기존 인터페이스 유지.
   * 기존 GUIDE의 다음 열차 표시 기능은 건드리지 않는다.
   */

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Tokyo Metro Provider] getTrains", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },

  /*
   * =======================================================
   * Station Timetable
   * =======================================================
   */

  getTimetable: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    /*
     * Tokyo Metro 전용 ODPT Center API Key.
     *
     * 기존 ODPT_API_KEY는 JR / Keikyu / Seibu / Tokyu에서
     * 계속 사용하므로 건드리지 않는다.
     */
    const apiKey = process.env.TOKYO_METRO_API_KEY;

    if (!apiKey) {
      throw new Error(
        "TOKYO_METRO_API_KEY is not configured.",
      );
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(
        `Unsupported Tokyo Metro lineId: ${lineId}`,
      );
    }

    const stationName = getStationName(
      lineId,
      stationId,
    );

    const direction = getRailDirection(
      lineId,
      directionId,
    );

    const station =
      `odpt.Station:TokyoMetro.Chiyoda.${stationName}`;

    const railDirection =
      `odpt.RailDirection:${direction}`;

    const calendar =
      `odpt.Calendar:${getCalendar()}`;

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:TokyoMetro",
    );

    url.searchParams.set(
      "odpt:railway",
      railway,
    );

    url.searchParams.set(
      "odpt:station",
      station,
    );

    url.searchParams.set(
      "odpt:railDirection",
      railDirection,
    );

    url.searchParams.set(
      "odpt:calendar",
      calendar,
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    console.log(
      "[Tokyo Metro Provider] StationTimetable request",
      {
        lineId,
        stationId,
        station,
        directionId,
        railDirection,
        calendar,
      },
    );

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Tokyo Metro timetable request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data =
      (await response.json()) as OdptStationTimetable[];

    const timetable: RailwayTimetable[] =
      data.flatMap(
        (
          stationTimetable,
          timetableIndex,
        ) => {
          const objects =
            stationTimetable[
              "odpt:stationTimetableObject"
            ] ?? [];

          return objects.flatMap(
            (
              item,
              itemIndex,
            ) => {
              const departureTime =
                item["odpt:departureTime"];

              if (!departureTime) {
                return [];
              }

              const trainType =
                getLastSegment(
                  item["odpt:trainType"],
                );

              const destinationStationFull =
                item[
                  "odpt:destinationStation"
                ]?.[0];

              const destinationStation =
                getLastSegment(
                  destinationStationFull,
                );

              return [
                {
                  id:
                    `tokyo-metro-${lineId}-${stationId}-` +
                    `${directionId}-${departureTime}-` +
                    `${timetableIndex}-${itemIndex}`,

                  operator: "tokyo-metro",

                  lineId,
                  stationId,
                  directionId,

                  departureTime,

                  trainType,

                  destinationStation,

                  destinationKo:
                    destinationStation,

                  destinationJa:
                    destinationStation,
                },
              ];
            },
          );
        },
      );

    console.log(
      "[Tokyo Metro Provider] StationTimetable result",
      {
        lineId,
        stationId,
        directionId,
        count: timetable.length,
      },
    );

    return timetable;
  },
};