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
 * Destination Name
 * =========================================================
 *
 * ODPT의 destinationStation은
 * 게이큐뿐 아니라 직통운전 노선의 역도 포함할 수 있다.
 *
 * 예:
 *
 * Keikyu → Toei Asakusa → Keisei → Hokuso
 */

type DestinationName = {
  ko: string;
  ja: string;
};

export const KEIKYU_DESTINATION_MAP: Record<string, DestinationName> = {
  /*
   * Keikyu
   */

  Shinagawa: {
    ko: "시나가와",
    ja: "品川",
  },

  Sengakuji: {
    ko: "센가쿠지",
    ja: "泉岳寺",
  },

  KeikyuKamata: {
    ko: "게이큐카마타",
    ja: "京急蒲田",
  },

  KanagawaShimmachi: {
    ko: "가나가와신마치",
    ja: "神奈川新町",
  },

  ZushiHayama: {
    ko: "즈시·하야마",
    ja: "逗子・葉山",
  },

  KeikyuKurihama: {
    ko: "게이큐쿠리하마",
    ja: "京急久里浜",
  },

  /*
   * Keisei
   */

  KeiseiTakasago: {
    ko: "게이세이다카사고",
    ja: "京成高砂",
  },

  KeiseiNarita: {
    ko: "게이세이나리타",
    ja: "京成成田",
  },

  NaritaAirportTerminal1: {
    ko: "나리타공항 제1터미널",
    ja: "成田空港第1ターミナル",
  },

  NaritaAirportTerminal2and3: {
    ko: "나리타공항 제2·제3터미널",
    ja: "成田空港第2・第3ターミナル",
  },

  /*
   * Hokuso
   */

  ImbaNihonIdai: {
    ko: "인바니혼이다이",
    ja: "印旛日本医大",
  },

  /*
   * Toei Asakusa / through service
   */

  NishiMagome: {
    ko: "니시마고메",
    ja: "西馬込",
  },

  /*
   * Haneda Airport
   */

  HanedaAirportTerminal1and2: {
    ko: "하네다공항 제1·제2터미널",
    ja: "羽田空港第1・第2ターミナル",
  },

  HanedaAirportTerminal3: {
    ko: "하네다공항 제3터미널",
    ja: "羽田空港第3ターミナル",
  },
};

/*
 * =========================================================
 * Destination Resolver
 * =========================================================
 */

const getDestinationName = (
  stationId?: string,
): DestinationName | undefined => {
  if (!stationId) {
    return undefined;
  }

  return KEIKYU_DESTINATION_MAP[stationId];
};

/*
 * =========================================================
 * Calendar
 * =========================================================
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
     * =====================================================
     * ODPT → Unified RailwayTimetable
     * =====================================================
     */

    const timetable: RailwayTimetable[] = timetableData[
      "odpt:stationTimetableObject"
    ]
      .filter((item) => item["odpt:departureTime"])
      .map((item, index) => {
        const destination = item["odpt:destinationStation"]?.[0];

        const destinationStation = getShortName(destination) ?? undefined;

        const destinationName = getDestinationName(destinationStation);

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

          destinationKo: destinationName?.ko,

          destinationJa: destinationName?.ja,
        };
      });

    return timetable;
  },
};
