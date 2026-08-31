import type { RailwayTimetable } from "@/types/railway";
import { seibuStationNames } from "./seibuStationNames";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  sayama: "odpt.Railway:Seibu.Sayama",
  haijima: "odpt.Railway:Seibu.Haijima",
  ikebukuro: "odpt.Railway:Seibu.Ikebukuro",
  kokubunji: "odpt.Railway:Seibu.Kokubunji",
  "seibu-chichibu": "odpt.Railway:Seibu.SeibuChichibu",
  "seibu-yurakucho": "odpt.Railway:Seibu.SeibuYurakucho",
  seibuen: "odpt.Railway:Seibu.Seibuen",
  shinjuku: "odpt.Railway:Seibu.Shinjuku",
  tamagawa: "odpt.Railway:Seibu.Tamagawa",
  tamako: "odpt.Railway:Seibu.Tamako",
  toshima: "odpt.Railway:Seibu.Toshima",
  yamaguchi: "odpt.Railway:Seibu.Yamaguchi",
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

export const seibuProvider: RailwayProvider = {
  operator: "seibu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Seibu Provider] getTrains", {
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
      throw new Error(`Unsupported Seibu lineId: ${lineId}`);
    }

    const railwayName = getLastSegment(railway);

    if (!railwayName) {
      throw new Error(`Invalid Seibu railway ID: ${railway}`);
    }

    const station = `odpt.Station:Seibu.${railwayName}.${stationId}`;
    const railDirection = `odpt.RailDirection:${directionId}`;
    const calendar = `odpt.Calendar:${getCalendar()}`;

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:StationTimetable`);

    url.searchParams.set("odpt:operator", "odpt.Operator:Seibu");
    url.searchParams.set("odpt:railway", railway);
    url.searchParams.set("odpt:station", station);
    url.searchParams.set("odpt:railDirection", railDirection);
    url.searchParams.set("odpt:calendar", calendar);
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Seibu timetable request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OdptStationTimetable[];

    const timetable: RailwayTimetable[] = data.flatMap(
      (stationTimetable, timetableIndex) => {
        const objects =
          stationTimetable["odpt:stationTimetableObject"] ?? [];

        return objects.flatMap((item, itemIndex) => {
          const departureTime = item["odpt:departureTime"];

          if (!departureTime) {
            return [];
          }

          const trainType = getLastSegment(item["odpt:trainType"]);

          const destinationStationFull =
            item["odpt:destinationStation"]?.[0];

          const destinationStation = getLastSegment(
            destinationStationFull,
          );

          const destinationName = destinationStation
            ? seibuStationNames[destinationStation]
            : undefined;

          return [
            {
              id: `seibu-${lineId}-${stationId}-${directionId}-${departureTime}-${timetableIndex}-${itemIndex}`,
              operator: "seibu",
              lineId,
              stationId,
              directionId,
              departureTime,
              trainType,
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