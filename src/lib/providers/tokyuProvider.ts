import type { RailwayTimetable } from "@/types/railway";
import { tokyuStationNames } from "./tokyuStationNames";
import { tokyuTrainTypes } from "./tokyuTrainTypes";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  toyoko: "odpt.Railway:Tokyu.Toyoko",
  meguro: "odpt.Railway:Tokyu.Meguro",
  "den-en-toshi": "odpt.Railway:Tokyu.DenEnToshi",
  oimachi: "odpt.Railway:Tokyu.Oimachi",
  ikegami: "odpt.Railway:Tokyu.Ikegami",
  "tokyu-tamagawa": "odpt.Railway:Tokyu.TokyuTamagawa",
  setagaya: "odpt.Railway:Tokyu.Setagaya",
  kodomonokuni: "odpt.Railway:Tokyu.Kodomonokuni",
  "tokyu-shin-yokohama": "odpt.Railway:Tokyu.TokyuShinYokohama",
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
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

export const tokyuProvider: RailwayProvider = {
  operator: "tokyu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Tokyu Provider] getTrains", {
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
      throw new Error("ODPT_API_KEY is not configured.");
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(`Unsupported Tokyu lineId: ${lineId}`);
    }

    const railwayName = getLastSegment(railway);

    if (!railwayName) {
      throw new Error(`Invalid Tokyu railway ID: ${railway}`);
    }

    const station = `odpt.Station:Tokyu.${railwayName}.${stationId}`;
    const railDirection = `odpt.RailDirection:${directionId}`;
    const calendar = `odpt.Calendar:${getCalendar()}`;

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Tokyu",
    );

    url.searchParams.set("odpt:railway", railway);
    url.searchParams.set("odpt:station", station);

    url.searchParams.set(
      "odpt:railDirection",
      railDirection,
    );

    url.searchParams.set("odpt:calendar", calendar);
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Tokyu timetable request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data =
      (await response.json()) as OdptStationTimetable[];

    const timetable: RailwayTimetable[] = data.flatMap(
      (stationTimetable, timetableIndex) => {
        const objects =
          stationTimetable["odpt:stationTimetableObject"] ?? [];

        return objects.flatMap((item, itemIndex) => {
          const departureTime = item["odpt:departureTime"];

          if (!departureTime) {
            return [];
          }

          const trainType = getLastSegment(
            item["odpt:trainType"],
          );

          const trainTypeName = trainType
            ? tokyuTrainTypes[trainType]
            : undefined;

          const destinationStationFull =
            item["odpt:destinationStation"]?.[0];

          const destinationStation = getLastSegment(
            destinationStationFull,
          );

          const destinationName = destinationStation
            ? tokyuStationNames[destinationStation]
            : undefined;

          return [
            {
              id: `tokyu-${lineId}-${stationId}-${directionId}-${departureTime}-${timetableIndex}-${itemIndex}`,
              operator: "tokyu",
              lineId,
              stationId,
              directionId,
              departureTime,
              trainType,
              trainTypeKo: trainTypeName?.ko,
              trainTypeJa: trainTypeName?.ja,
              destinationStation,
              destinationKo: destinationName?.ko,
              destinationJa: destinationName?.ja,
            },
          ];
        });
      },
    );

    return timetable;
  },
};