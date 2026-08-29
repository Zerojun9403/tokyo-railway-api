import type { RailwayProvider } from "./types";
import type { RailwayTimetable, RailwayTrain } from "../../types/railway";

type KeikyuTrainRaw = {
  "@id": string;
  "@type": "odpt:Train";

  "dc:date": string;
  "dct:valid": string;

  "odpt:railway": string;
  "odpt:operator": string;

  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;

  "odpt:trainType": string;
  "odpt:trainNumber": string;

  "odpt:railDirection": string;
};

type KeikyuStationTimetableObjectRaw = {
  "odpt:trainType"?: string;
  "odpt:departureTime"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:viaRailway"?: string[];
};

type KeikyuStationTimetableRaw = {
  "@id": string;
  "@type": "odpt:StationTimetable";

  "dc:date": string;

  "odpt:railway": string;
  "odpt:station": string;
  "odpt:calendar": string;
  "odpt:operator": string;
  "odpt:railDirection": string;

  "odpt:stationTimetableObject": KeikyuStationTimetableObjectRaw[];
};

/*
 * =========================================================
 * ODPT ID → Short Name
 * =========================================================
 */

const getShortName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const colonPart = value.split(":").at(-1) ?? value;

  return colonPart.split(".").at(-1) ?? colonPart;
};

/*
 * =========================================================
 * Keikyu lineId → ODPT Railway ID
 * =========================================================
 */

const KEIKYU_RAILWAY_MAP: Record<string, string> = {
  main: "odpt.Railway:Keikyu.Main",
  airport: "odpt.Railway:Keikyu.Airport",
  kurihama: "odpt.Railway:Keikyu.Kurihama",
  zushi: "odpt.Railway:Keikyu.Zushi",
  daishi: "odpt.Railway:Keikyu.Daishi",
};

/*
 * =========================================================
 * Calendar
 * =========================================================
 *
 * JavaScript getDay()
 *
 * 0 = Sunday
 * 1 = Monday
 * ...
 * 6 = Saturday
 */

const getKeikyuCalendar = (): string => {
  const day = new Date().getDay();

  if (day === 0 || day === 6) {
    return "SaturdayHoliday";
  }

  return "Weekday";
};

/*
 * =========================================================
 * API Key
 * =========================================================
 */

const getApiKey = (): string => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error("ODPT_API_KEY is not configured");
  }

  return apiKey;
};

/*
 * =========================================================
 * Keikyu Provider
 * =========================================================
 */

export const keikyuProvider: RailwayProvider = {
  operator: "keikyu",

  /*
   * =======================================================
   * Train Location
   * =======================================================
   */

  getTrains: async ({ lineId, stationId, directionId }) => {
    const apiKey = getApiKey();

    const railway = KEIKYU_RAILWAY_MAP[lineId];

    if (!railway) {
      throw new Error(`Unsupported Keikyu line: ${lineId}`);
    }

    const url = new URL("https://api-challenge.odpt.org/api/v4/odpt:Train");

    url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Keikyu API request failed: ${response.status}`);
    }

    const data = (await response.json()) as KeikyuTrainRaw[];

    const normalizedDirection = directionId.trim().toLowerCase();

    const normalizedStation = stationId.trim().toLowerCase();

    const filteredData = data.filter((train) => {
      const direction = getShortName(
        train["odpt:railDirection"],
      )?.toLowerCase();

      const fromStation = getShortName(
        train["odpt:fromStation"],
      )?.toLowerCase();

      const toStation = getShortName(train["odpt:toStation"])?.toLowerCase();

      const matchesDirection = direction === normalizedDirection;

      const matchesStation =
        fromStation === normalizedStation || toStation === normalizedStation;

      return matchesDirection && matchesStation;
    });

    const trains: RailwayTrain[] = filteredData.map((train) => {
      const fromStation = getShortName(train["odpt:fromStation"]) ?? undefined;

      const toStation = getShortName(train["odpt:toStation"]) ?? undefined;

      const trainType = getShortName(train["odpt:trainType"]) ?? undefined;

      return {
        id: train["@id"],

        operator: "keikyu",

        lineId,
        stationId,
        directionId,

        fromStation,
        toStation,

        trainType,

        trainNumber: train["odpt:trainNumber"],

        status: "normal",
      };
    });

    return trains;
  },

  /*
   * =======================================================
   * Station Timetable
   * =======================================================
   */

  getTimetable: async ({ lineId, stationId, directionId }) => {
    const apiKey = getApiKey();

    const railway = KEIKYU_RAILWAY_MAP[lineId];

    if (!railway) {
      throw new Error(`Unsupported Keikyu line: ${lineId}`);
    }

    const calendar = getKeikyuCalendar();

    const url = new URL(
      "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
    );

    url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Keikyu timetable API request failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as KeikyuStationTimetableRaw[];

    const normalizedStation = stationId.trim().toLowerCase();

    const normalizedDirection = directionId.trim().toLowerCase();

    /*
     * station + direction + calendar가
     * 모두 일치하는 시간표를 찾는다.
     */

    const timetableData = data.find((item) => {
      const station = getShortName(item["odpt:station"])?.toLowerCase();

      const direction = getShortName(item["odpt:railDirection"])?.toLowerCase();

      const itemCalendar = getShortName(item["odpt:calendar"]);

      return (
        station === normalizedStation &&
        direction === normalizedDirection &&
        itemCalendar === calendar
      );
    });

    if (!timetableData) {
      return [];
    }

    /*
     * ODPT StationTimetable
     * → Unified RailwayTimetable
     */

    const timetable: RailwayTimetable[] = timetableData[
      "odpt:stationTimetableObject"
    ]
      .filter((item) => item["odpt:departureTime"])
      .map((item, index) => {
        const destination = item["odpt:destinationStation"]?.[0];

        const destinationStation = getShortName(destination) ?? undefined;

        const trainType = getShortName(item["odpt:trainType"]) ?? undefined;

        return {
          id: `${timetableData["@id"]}-${index}`,

          operator: "keikyu",

          lineId,
          stationId,
          directionId,

          departureTime: item["odpt:departureTime"]!,

          trainType,

          destinationStation,
        };
      });

    return timetable;
  },
};
