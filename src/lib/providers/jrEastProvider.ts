import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
import { jrEastStationNames } from "@/lib/mappings/jrEastStationNames";
import { jrEastTrainTypes } from "@/lib/mappings/jrEastTrainTypes";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  yamanote: "odpt.Railway:JR-East.Yamanote",
  "chuo-rapid": "odpt.Railway:JR-East.ChuoRapid",
  "chuo-sobu": "odpt.Railway:JR-East.ChuoSobuLocal",
  saikyo: "odpt.Railway:JR-East.SaikyoKawagoe",
  "shonan-shinjuku": "odpt.Railway:JR-East.ShonanShinjuku",
  tokaido: "odpt.Railway:JR-East.Tokaido",
  "keihin-tohoku": "odpt.Railway:JR-East.KeihinTohokuNegishi",
  keiyo: "odpt.Railway:JR-East.Keiyo",
  yokosuka: "odpt.Railway:JR-East.Yokosuka",
  sobu: "odpt.Railway:JR-East.Sobu",
  "sobu-rapid": "odpt.Railway:JR-East.SobuRapid",
  narita: "odpt.Railway:JR-East.Narita",
  "narita-airport": "odpt.Railway:JR-East.NaritaAirportBranch",
};

const stationMaps: Record<
  string,
  Record<string, string>
> = {
  yamanote: {
    JY01: "Tokyo",
    JY02: "Kanda",
    JY03: "Akihabara",
    JY04: "Okachimachi",
    JY05: "Ueno",
    JY06: "Uguisudani",
    JY07: "Nippori",
    JY08: "NishiNippori",
    JY09: "Tabata",
    JY10: "Komagome",
    JY11: "Sugamo",
    JY12: "Otsuka",
    JY13: "Ikebukuro",
    JY14: "Mejiro",
    JY15: "Takadanobaba",
    JY16: "ShinOkubo",
    JY17: "Shinjuku",
    JY18: "Yoyogi",
    JY19: "Harajuku",
    JY20: "Shibuya",
    JY21: "Ebisu",
    JY22: "Meguro",
    JY23: "Gotanda",
    JY24: "Osaki",
    JY25: "Shinagawa",
    JY26: "TakanawaGateway",
    JY27: "Tamachi",
    JY28: "Hamamatsucho",
    JY29: "Shimbashi",
    JY30: "Yurakucho",
  },
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

type OdptTrainInformation = {
  "@id"?: string;
  "owl:sameAs"?: string;
  "dc:date"?: string;
  "dct:valid"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:trainInformationStatus"?: string;
  "odpt:trainInformationText"?: string;
  "odpt:trainInformationCause"?: string;
  "odpt:trainInformationRange"?: string;
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

const normalizeTrainInformationStatus = (
  rawStatus?: string,
  message?: string,
): TrainInformationStatus => {
  const status = rawStatus ?? "";
  const text = message ?? "";
  const combined = `${status} ${text}`;

  if (
    combined.includes("運転見合わせ") ||
    combined.includes("運転を見合わせ")
  ) {
    return "suspended";
  }

  if (
    combined.includes("一部運休") ||
    combined.includes("一部列車運休")
  ) {
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
    combined.includes("遅延") ||
    combined.includes("遅れ")
  ) {
    return "delay";
  }

  if (
    combined.includes("平常どおり") ||
    combined.includes("平常通り") ||
    combined.includes("通常どおり") ||
    combined.includes("通常通り")
  ) {
    return "normal";
  }

  if (
    status.includes("お知らせ") ||
    status.includes("情報")
  ) {
    return "information";
  }

  if (status || text) {
    return "information";
  }

  return "unknown";
};

const getTrainInformationTitle = (
  status: TrainInformationStatus,
): string => {
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

const stationName =
  stationMaps[lineId]?.[stationId] ?? stationId;

const station =
  `odpt.Station:${railwayName}.${stationName}`;

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
      const errorBody = await response.text();

      console.error(
        "[JR East Provider] timetable request failed",
        {
          status: response.status,
          statusText: response.statusText,
          railway,
          station,
          railDirection,
          calendar,
          errorBody,
        },
      );

      throw new Error(
        `JR East timetable request failed: ${response.status} ${response.statusText} - ${errorBody}`,
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

              const trainTypeName = trainType
                ? jrEastTrainTypes[trainType]
                : undefined;

              const destinationName = destinationStation
                ? jrEastStationNames[destinationStation]
                : undefined;

              return [
                {
                  id: `jr-east-${lineId}-${stationId}-${directionId}-${departureTime}-${timetableIndex}-${itemIndex}`,
                  operator: "jr-east",
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
            },
          );
        },
      );

    return timetable;
  },

  getTrainInformation: async ({
    lineId,
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

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
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
      "acl:consumerKey",
      apiKey,
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error(
        "[JR East Provider] train information request failed",
        {
          status: response.status,
          statusText: response.statusText,
          railway,
          errorBody,
        },
      );

      throw new Error(
        `JR East train information request failed: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const data =
      (await response.json()) as OdptTrainInformation[];

    const information: RailwayTrainInformation[] =
      data.map((item, index) => {
        const rawStatus =
          item["odpt:trainInformationStatus"];

        const message =
          item["odpt:trainInformationText"] ?? "";

        const status =
          normalizeTrainInformationStatus(
            rawStatus,
            message,
          );

        return {
          id:
            item["owl:sameAs"] ??
            item["@id"] ??
            `jr-east-${lineId}-train-information-${index}`,
          operator: "jr-east",
          lineId,
          status,
          title: getTrainInformationTitle(status),
          message,
          cause:
            item["odpt:trainInformationCause"],
          affectedSection:
            item["odpt:trainInformationRange"],
          rawStatus,
          updatedAt:
            item["dc:date"] ??
            item["dct:valid"],
        };
      });

    return information;
  },
};