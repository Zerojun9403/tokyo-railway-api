import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
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
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
};

type OdptTrainTimetableObject = {
  "odpt:arrivalTime"?: string;
  "odpt:departureTime"?: string;
  "odpt:arrivalStation"?: string;
  "odpt:departureStation"?: string;
};

type OdptTrainTimetable = {
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:railDirection"?: string;
  "odpt:trainTimetableObject"?: OdptTrainTimetableObject[];
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
  "odpt:railway"?: string;
  "odpt:operator"?: string;
  "odpt:trainInformationText"?:
    | string
    | OdptMultilingualText;
  "odpt:trainInformationStatus"?:
    | string
    | OdptMultilingualText;
  "odpt:trainInformationCause"?:
    | string
    | OdptMultilingualText;
  "odpt:trainInformationRange"?:
    | string
    | OdptMultilingualText;
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

const getJapaneseText = (
  value?: string | OdptMultilingualText,
): string => {
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
   * 정상 문구는 반드시 지연 판정보다 먼저 검사한다.
   *
   * "遅延はありません" 같은 문장에는
   * "遅延"이라는 단어 자체가 포함되어 있기 때문이다.
   */
  if (
    combined.includes("遅延はありません") ||
    combined.includes("遅れはありません") ||
    combined.includes("平常どおり") ||
    combined.includes("平常通り") ||
    combined.includes("平常通り運転") ||
    combined.includes("通常どおり") ||
    combined.includes("通常通り")
  ) {
    return "normal";
  }

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

export const tokyuProvider: RailwayProvider = {
  operator: "tokyu",

  getTrains: async ({ lineId, stationId, directionId }) => {
    console.log("[Tokyu Provider] getTrains", {
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
      throw new Error(`Unsupported Tokyu lineId: ${lineId}`);
    }

    const railwayName = getLastSegment(railway);

    if (!railwayName) {
      throw new Error(`Invalid Tokyu railway ID: ${railway}`);
    }

    const station = `odpt.Station:Tokyu.${railwayName}.${stationId}`;
    const railDirection = `odpt.RailDirection:${directionId}`;
    const calendar = `odpt.Calendar:${getCalendar()}`;

    /*
     * CULLINAN 도큐:
     * StationTimetable은 기존처럼 먼저 조회한다.
     * 여기서 실제 ODPT가 인정하는 canonical station ID를 얻는다.
     */
    const stationUrl = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    stationUrl.searchParams.set("odpt:operator", "odpt.Operator:Tokyu");
    stationUrl.searchParams.set("odpt:railway", railway);
    stationUrl.searchParams.set("odpt:station", station);
    stationUrl.searchParams.set("odpt:railDirection", railDirection);
    stationUrl.searchParams.set("odpt:calendar", calendar);
    stationUrl.searchParams.set("acl:consumerKey", apiKey);

    console.log("[Tokyu StationTimetable Request]", {
      lineId,
      stationId,
      directionId,
      railway,
      station,
      railDirection,
      calendar,
      url: stationUrl.toString().replace(apiKey, "[REDACTED]"),
    });

    const stationResponse = await fetch(stationUrl, { cache: "no-store" });

    if (!stationResponse.ok) {
      const body = await stationResponse.text();

      throw new Error(
        `Tokyu StationTimetable request failed: ${stationResponse.status} ${stationResponse.statusText} - ${body}`,
      );
    }

    const stationData =
      (await stationResponse.json()) as OdptStationTimetable[];

    const canonicalStation =
      stationData[0]?.["odpt:station"] ?? station;

    /*
     * 핵심 수정:
     * challenge ODPT의 TrainTimetable은 operator/railway/direction을
     * 한꺼번에 넣은 복합 검색이 실패할 수 있으므로 railway 하나로 조회한 뒤
     * 서버에서 direction + station을 필터링한다.
     *
     * 이 방식이면 trainNumber를 확보할 수 있고,
     * DT27 같은 종착역은 departureTime 대신 arrivalTime도 사용할 수 있다.
     */
    const trainUrl = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainTimetable`,
    );

    trainUrl.searchParams.set("odpt:railway", railway);
    trainUrl.searchParams.set("acl:consumerKey", apiKey);

    console.log("[Tokyu TrainTimetable Request]", {
      lineId,
      stationId,
      directionId,
      railway,
      canonicalStation,
      railDirection,
      url: trainUrl.toString().replace(apiKey, "[REDACTED]"),
    });

    const trainResponse = await fetch(trainUrl, { cache: "no-store" });

    if (trainResponse.ok) {
      const trainData =
        (await trainResponse.json()) as OdptTrainTimetable[];

      const trainTimetable: RailwayTimetable[] = trainData.flatMap(
        (train, trainIndex) => {
          if (
            train["odpt:railDirection"] &&
            train["odpt:railDirection"] !== railDirection
          ) {
            return [];
          }

          const stationObject =
            train["odpt:trainTimetableObject"]?.find(
              (item) =>
                item["odpt:arrivalStation"] === canonicalStation ||
                item["odpt:departureStation"] === canonicalStation,
            );

          if (!stationObject) {
            return [];
          }

          const stationTime =
            stationObject["odpt:departureTime"] ??
            stationObject["odpt:arrivalTime"];

          if (!stationTime) {
            return [];
          }

          const trainType = getLastSegment(train["odpt:trainType"]);
          const trainTypeName = trainType
            ? tokyuTrainTypes[trainType]
            : undefined;

          const destinationStation = getLastSegment(
            train["odpt:destinationStation"]?.[0],
          );
          const destinationName = destinationStation
            ? tokyuStationNames[destinationStation]
            : undefined;

          return [
            {
              id: `tokyu-${lineId}-${stationId}-${directionId}-${stationTime}-train-${trainIndex}`,
              operator: "tokyu",
              lineId,
              stationId,
              directionId,
              departureTime: stationTime,
              trainNumber: train["odpt:trainNumber"],
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

      if (trainTimetable.length > 0) {
        trainTimetable.sort((a, b) =>
          a.departureTime.localeCompare(b.departureTime),
        );

        console.log("[Tokyu TrainTimetable Result]", {
          lineId,
          stationId,
          directionId,
          records: trainTimetable.length,
          withTrainNumber: trainTimetable.filter(
            (item) => Boolean(item.trainNumber),
          ).length,
        });

        return trainTimetable;
      }

      console.warn("[Tokyu TrainTimetable Empty]", {
        lineId,
        stationId,
        directionId,
        rawTrainRecords: trainData.length,
        canonicalStation,
      });
    } else {
      const body = await trainResponse.text();

      console.error("[Tokyu TrainTimetable Failed]", {
        lineId,
        stationId,
        directionId,
        status: trainResponse.status,
        body,
      });
    }

    /*
     * TrainTimetable을 사용할 수 없는 경우 기존 StationTimetable으로
     * 안전하게 fallback한다. trainNumber가 제공되면 그대로 보존한다.
     */
    const timetable: RailwayTimetable[] = stationData.flatMap(
      (stationTimetable, timetableIndex) => {
        const objects =
          stationTimetable["odpt:stationTimetableObject"] ?? [];

        return objects.flatMap((item, itemIndex) => {
          const departureTime = item["odpt:departureTime"];

          if (!departureTime) {
            return [];
          }

          const trainType = getLastSegment(item["odpt:trainType"]);
          const trainTypeName = trainType
            ? tokyuTrainTypes[trainType]
            : undefined;

          const destinationStation =
            getLastSegment(item["odpt:destinationStation"]?.[0]);
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
              trainNumber: item["odpt:trainNumber"],
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

    timetable.sort((a, b) =>
      a.departureTime.localeCompare(b.departureTime),
    );

    return timetable;
  },

  getTrainInformation: async ({
    lineId,
  }): Promise<RailwayTrainInformation[]> => {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ODPT_API_KEY is not configured.",
      );
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(
        `Unsupported Tokyu lineId: ${lineId}`,
      );
    }

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Tokyu",
    );

    url.searchParams.set(
      "odpt:railway",
      railway,
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    console.log("[Tokyu TrainInformation Request]", {
      lineId,
      railway,
      url: url.toString().replace(
        apiKey,
        "[REDACTED]",
      ),
    });

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Tokyu TrainInformation request failed: ${response.status} ${body}`,
      );
    }

    const data =
      (await response.json()) as OdptTrainInformation[];

    console.log("[Tokyu TrainInformation Result]", {
      lineId,
      railway,
      records: data.length,
    });

    return data.map((item, index) => {
      const message = getJapaneseText(
        item["odpt:trainInformationText"],
      );

      const rawStatus = getJapaneseText(
        item["odpt:trainInformationStatus"],
      );

      const cause = getJapaneseText(
        item["odpt:trainInformationCause"],
      );

      const affectedSection = getJapaneseText(
        item["odpt:trainInformationRange"],
      );

      const status =
        normalizeTrainInformationStatus(
          rawStatus,
          message,
        );

      return {
        id:
          item["owl:sameAs"] ??
          item["@id"] ??
          `tokyu-${lineId}-train-information-${index}`,

        operator: "tokyu",
        lineId,

        status,
        title: getTrainInformationTitle(status),

        message,

        cause: cause || undefined,
        affectedSection:
          affectedSection || undefined,
        rawStatus: rawStatus || undefined,

        updatedAt:
          item["dc:date"] ??
          item["dct:valid"],
      };
    });
  },
};