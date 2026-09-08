import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
import { seibuStationNames } from "./seibuStationNames";
import { seibuTrainTypes } from "./seibuTrainTypes";
import { getOdptDestinationNameKo } from "./odptDestinationNames";
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

type OdptStation = {
  "owl:sameAs"?: string;
  "odpt:stationCode"?: string;
};

const normalizeStationCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/^([A-Z]+)0+(\d+)$/, "$1$2");

const resolveSeibuStationId = async ({
  railway,
  stationId,
  apiKey,
}: {
  railway: string;
  stationId: string;
  apiKey: string;
}): Promise<string> => {
  if (!/^[A-Za-z]+\d+$/.test(stationId.trim())) {
    return stationId.trim();
  }

  const url = new URL(`${ODPT_API_BASE_URL}/odpt:Station`);
  url.searchParams.set("odpt:operator", "odpt.Operator:Seibu");
  url.searchParams.set("odpt:railway", railway);
  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Seibu station request failed: ${response.status}`);
  }

  const stations = (await response.json()) as OdptStation[];
  const targetCode = normalizeStationCode(stationId);
  const matched = stations.find((item) => {
    const code = item["odpt:stationCode"];
    return code ? normalizeStationCode(code) === targetCode : false;
  });

  return getLastSegment(matched?.["owl:sameAs"]) ?? stationId.trim();
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
  "odpt:trainType"?: string;
  "odpt:trainNumber"?: string;
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

type OdptMultilingualText = {
  ja?: string;
  en?: string;
};

type OdptTrainInformation = {
  "@id"?: string;
  "@type"?: string;
  "dc:date"?: string;
  "dct:valid"?: string;
  "owl:sameAs"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:trainInformationText"?: string | OdptMultilingualText;
  "odpt:trainInformationStatus"?: string | OdptMultilingualText;
  "odpt:trainInformationCause"?: string | OdptMultilingualText;
  "odpt:trainInformationRange"?: string | OdptMultilingualText;
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

const getJapaneseText = (value?: string | OdptMultilingualText): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.ja ?? value.en ?? "";
};

const normalizeTrainInformationStatus = (
  rawStatus: string,
  message: string,
): TrainInformationStatus => {
  const combined = `${rawStatus} ${message}`;

  /*
   * 정상 문구를 지연 판정보다 먼저 확인한다.
   */
  if (
    combined.includes("遅延はありません") ||
    combined.includes("遅れはありません") ||
    combined.includes("平常どおり") ||
    combined.includes("平常通り") ||
    combined.includes("通常どおり") ||
    combined.includes("通常通り") ||
    combined.includes("平常運転")
  ) {
    return "normal";
  }

  if (
    combined.includes("運転見合わせ") ||
    combined.includes("運転を見合わせ")
  ) {
    return "suspended";
  }

  if (combined.includes("一部運休") || combined.includes("一部列車運休")) {
    return "partial-suspension";
  }

  if (
    combined.includes("直通運転中止") ||
    combined.includes("直通運転を中止")
  ) {
    return "through-service-suspended";
  }

  if (
    combined.includes("運転再開見込") ||
    combined.includes("運転再開見込み")
  ) {
    return "resuming";
  }

  if (
    combined.includes("ダイヤ乱れ") ||
    combined.includes("ダイヤが乱れ") ||
    combined.includes("遅延") ||
    combined.includes("遅れ")
  ) {
    return "delay";
  }

  if (rawStatus || message) {
    return "information";
  }

  return "unknown";
};

const getTrainInformationTitle = (status: TrainInformationStatus): string => {
  switch (status) {
    case "normal":
      return "정상 운행";

    case "delay":
      return "지연";

    case "suspended":
      return "운행 중지";

    case "partial-suspension":
      return "일부 운휴";

    case "through-service-suspended":
      return "직통 운행 중지";

    case "resuming":
      return "운행 재개 예정";

    case "information":
      return "운행 안내";

    default:
      return "운행정보";
  }
};

export const seibuProvider: RailwayProvider = {
  operator: "seibu",

  getTrains: async ({ lineId, stationId, directionId }) => {
    console.log("[Seibu Provider] getTrains", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },

  getTimetable: async ({ lineId, stationId, directionId }) => {
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

    const resolvedStationId = await resolveSeibuStationId({
      railway,
      stationId,
      apiKey,
    });

    const station = `odpt.Station:Seibu.${railwayName}.${resolvedStationId}`;

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
        const objects = stationTimetable["odpt:stationTimetableObject"] ?? [];

        return objects.flatMap((item, itemIndex) => {
          const departureTime = item["odpt:departureTime"];

          if (!departureTime) {
            return [];
          }

          const trainType = getLastSegment(item["odpt:trainType"]);

          const trainNumber = item["odpt:trainNumber"];

          const trainTypeName = trainType
            ? seibuTrainTypes[trainType]
            : undefined;

          const destinationStationFull = item["odpt:destinationStation"]?.[0];

          const destinationStation = getLastSegment(destinationStationFull);

          const destinationName = destinationStation
            ? seibuStationNames[destinationStation]
            : undefined;

          const destinationNameKo = getOdptDestinationNameKo(
            destinationStationFull,
          );

          return [
            {
              id: `seibu-${lineId}-${stationId}-${directionId}-${departureTime}-${timetableIndex}-${itemIndex}`,
              operator: "seibu",
              lineId,
              stationId,
              directionId,
              departureTime,
              trainType,
              trainNumber,
              trainTypeKo: trainTypeName?.ko,
              trainTypeJa: trainTypeName?.ja,
              destinationStation,
              destinationKo:
                destinationNameKo ?? destinationName?.ko ?? destinationStation,
              destinationJa: destinationName?.ja ?? destinationStation,
            },
          ];
        });
      },
    );

    return timetable;
  },

  getTrainInformation: async ({
    lineId,
  }): Promise<RailwayTrainInformation[]> => {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      throw new Error("ODPT_API_KEY is not configured.");
    }

    /*
     * lineId가 GUIDE/API에서 지원하는
     * 실제 Seibu 노선인지 먼저 검증한다.
     *
     * Seibu TrainInformation은 현재 확인된 원본 기준
     * 노선별이 아닌 회사 전체 1건으로 제공된다.
     */
    if (!railwayMap[lineId]) {
      throw new Error(`Unsupported Seibu lineId: ${lineId}`);
    }

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainInformation`);

    url.searchParams.set("odpt:operator", "odpt.Operator:Seibu");

    url.searchParams.set("acl:consumerKey", apiKey);

    console.log("[Seibu TrainInformation Request]", {
      lineId,
      url: url.toString().replace(apiKey, "[REDACTED]"),
    });

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Seibu TrainInformation request failed: ${response.status} ${body}`,
      );
    }

    const data = (await response.json()) as OdptTrainInformation[];

    console.log("[Seibu TrainInformation Result]", {
      lineId,
      records: data.length,
    });

    return data.map((item, index) => {
      const message = getJapaneseText(item["odpt:trainInformationText"]);

      const rawStatus = getJapaneseText(item["odpt:trainInformationStatus"]);

      const cause = getJapaneseText(item["odpt:trainInformationCause"]);

      const affectedSection = getJapaneseText(
        item["odpt:trainInformationRange"],
      );

      const status = normalizeTrainInformationStatus(rawStatus, message);

      return {
        id:
          item["owl:sameAs"] ??
          item["@id"] ??
          `seibu-${lineId}-train-information-${index}`,

        operator: "seibu",
        lineId,

        status,
        title: getTrainInformationTitle(status),

        message,

        cause: cause || undefined,

        affectedSection: affectedSection || undefined,

        rawStatus: rawStatus || undefined,

        updatedAt: item["dc:date"] ?? item["dct:valid"],
      };
    });
  },
};
