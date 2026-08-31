import type { RailwayTimetable } from "@/types/railway";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  yamanote: "odpt.Railway:JR-East.Yamanote",
  "chuo-rapid": "odpt.Railway:JR-East.ChuoRapid",
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
};

type OdptStationTimetable = {
  "owl:sameAs"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:calendar"?: string;
  "odpt:railDirection"?: string;
  "odpt:stationTimetableObject"?: OdptStationTimetableObject[];
};

const getLastSegment = (
  value?: string,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  const segments = value.split(".");
  return segments[segments.length - 1];
};

const getCalendar = (): "Weekday" | "SaturdayHoliday" => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  });

  const weekday = formatter.format(new Date());

  if (weekday === "Sat" || weekday === "Sun") {
    return "SaturdayHoliday";
  }

  return "Weekday";
};

export const jrEastProvider: RailwayProvider = {
  operator: "jr-east",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[JR East Provider] getTrains", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },

  getTimetable: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ODPT_API_KEY is not configured.",
      );
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(
        `Unsupported JR East lineId: ${lineId}`,
      );
    }

    const railwayName = railway.replace(
      "odpt.Railway:",
      "",
    );

    const station =
      `odpt.Station:${railwayName}.${stationId}`;

    const railDirection =
      `odpt.RailDirection:${directionId}`;

    const calendar =
      `odpt.Calendar:${getCalendar()}`;

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:JR-East",
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

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `JR East timetable request failed: ${response.status} ${response.statusText}`,
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
            (item, itemIndex) => {
              const departureTime =
                item["odpt:departureTime"];

              if (!departureTime) {
                return [];
              }

              const trainType =
                getLastSegment(
                  item["odpt:trainType"],
                );

              const destinationStation =
                getLastSegment(
                  item[
                    "odpt:destinationStation"
                  ]?.[0],
                );

              return [
                {
                  id: `jr-east-${lineId}-${stationId}-${directionId}-${departureTime}-${timetableIndex}-${itemIndex}`,
                  operator: "jr-east",
                  lineId,
                  stationId,
                  directionId,
                  departureTime,
                  trainType,
                  destinationStation,
                },
              ];
            },
          );
        },
      );

    return timetable;
  },
};