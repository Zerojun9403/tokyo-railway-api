import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL = "https://api-public.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  asakusa: "odpt.Railway:Toei.Asakusa",
  mita: "odpt.Railway:Toei.Mita",
  shinjuku: "odpt.Railway:Toei.Shinjuku",
  oedo: "odpt.Railway:Toei.Oedo",
};

const stationMaps: Record<string, Record<string, string>> = {
  asakusa: {
    A01: "NishiMagome",
    A02: "Magome",
    A03: "Nakanobu",
    A04: "Togoshi",
    A05: "Gotanda",
    A06: "Takanawadai",
    A07: "Sengakuji",
    A08: "Mita",
    A09: "Daimon",
    A10: "Shimbashi",
    A11: "HigashiGinza",
    A12: "Takaracho",
    A13: "Nihombashi",
    A14: "Ningyocho",
    A15: "HigashiNihombashi",
    A16: "Asakusabashi",
    A17: "Kuramae",
    A18: "Asakusa",
    A19: "HonjoAzumabashi",
    A20: "Oshiage",
  },

  mita: {
    I01: "Meguro",
    I02: "Shirokanedai",
    I03: "ShirokaneTakanawa",
    I04: "Mita",
    I05: "Shibakoen",
    I06: "Onarimon",
    I07: "Uchisaiwaicho",
    I08: "Hibiya",
    I09: "Otemachi",
    I10: "Jimbocho",
    I11: "Suidobashi",
    I12: "Kasuga",
    I13: "Hakusan",
    I14: "Sengoku",
    I15: "Sugamo",
    I16: "NishiSugamo",
    I17: "ShinItabashi",
    I18: "ItabashiKuyakushomae",
    I19: "Itabashihoncho",
    I20: "Motohasunuma",
    I21: "ShimuraSakaue",
    I22: "ShimuraSanchome",
    I23: "Hasune",
    I24: "Nishidai",
    I25: "Takashimadaira",
    I26: "ShinTakashimadaira",
    I27: "NishiTakashimadaira",
  },

  shinjuku: {
    S01: "Shinjuku",
    S02: "ShinjukuSanchome",
    S03: "Akebonobashi",
    S04: "Ichigaya",
    S05: "Kudanshita",
    S06: "Jimbocho",
    S07: "Ogawamachi",
    S08: "Iwamotocho",
    S09: "BakuroYokoyama",
    S10: "Hamacho",
    S11: "Morishita",
    S12: "Kikukawa",
    S13: "Sumiyoshi",
    S14: "NishiOjima",
    S15: "Ojima",
    S16: "HigashiOjima",
    S17: "Funabori",
    S18: "Ichinoe",
    S19: "Mizue",
    S20: "Shinozaki",
    S21: "Motoyawata",
  },

  oedo: {
    E01: "ShinjukuNishiguchi",
    E02: "HigashiShinjuku",
    E03: "WakamatsuKawada",
    E04: "UshigomeYanagicho",
    E05: "UshigomeKagurazaka",
    E06: "Iidabashi",
    E07: "Kasuga",
    E08: "HongoSanchome",
    E09: "UenoOkachimachi",
    E10: "ShinOkachimachi",
    E11: "Kuramae",
    E12: "Ryogoku",
    E13: "Morishita",
    E14: "KiyosumiShirakawa",
    E15: "MonzenNakacho",
    E16: "Tsukishima",
    E17: "Kachidoki",
    E18: "Tsukijishijo",
    E19: "Shiodome",
    E20: "Daimon",
    E21: "Akabanebashi",
    E22: "AzabuJuban",
    E23: "Roppongi",
    E24: "AoyamaItchome",
    E25: "KokuritsuKyogijo",
    E26: "Yoyogi",
    E27: "Shinjuku",
    E28: "Tochomae",
    E29: "NishiShinjukuGochome",
    E30: "NakanoSakaue",
    E31: "HigashiNakano",
    E32: "Nakai",
    E33: "OchiaiMinamiNagasaki",
    E34: "ShinEgota",
    E35: "Nerima",
    E36: "Toshimaen",
    E37: "NerimaKasugacho",
    E38: "Hikarigaoka",
  },
};

const directionMaps: Record<string, Record<string, string>> = {
  asakusa: {
    oshiage: "Northbound",
    nishimagome: "Southbound",
  },

  mita: {
    nishitakashimadaira: "Northbound",
    meguro: "Southbound",
  },

  shinjuku: {
    motoyawata: "Eastbound",
    shinjuku: "Westbound",
  },

  oedo: {
    inner: "InnerLoop",
    outer: "OuterLoop",

    /*
     * GUIDE 도초마에(E28) 전용 방향 ID.
     *
     * 도초마에는 일반적인 inner / outer 표시 대신
     * 실제 이용자가 보는 방면을 세분화해서 표시한다.
     */
    "roppongi-daimon": "InnerLoop",
    "iidabashi-ryogoku": "OuterLoop",
    "nerima-hikarigaoka": "Toei.Hikarigaoka",
  },
};

type OdptStationTimetableObject = {
  "odpt:departureTime"?: string;
  "odpt:trainType"?: string;
  "odpt:trainNumber"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:isLast"?: boolean;
};

type OdptStationTimetable = {
  "@type"?: string;
  "owl:sameAs"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: OdptStationTimetableObject[];
};

type OdptMultilingualText = {
  ja?: string;
  en?: string;
};

type OdptTrainInformation = {
  "@id"?: string;
  "owl:sameAs"?: string;
  "dc:date"?: string;
  "dct:valid"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:timeOfOrigin"?: string;
  "odpt:railDirection"?: string;
  "odpt:trainInformationText"?: OdptMultilingualText;
  "odpt:trainInformationCause"?: OdptMultilingualText;
  "odpt:trainInformationStatus"?: OdptMultilingualText;
};

const getLastSegment = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const parts = value.split(".");
  return parts[parts.length - 1];
};

const getCalendar = (): "Weekday" | "SaturdayHoliday" => {
  const tokyoDateString = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(new Date());

  if (tokyoDateString === "Sat" || tokyoDateString === "Sun") {
    return "SaturdayHoliday";
  }

  return "Weekday";
};

const getStationName = (
  lineId: string,
  stationId: string,
): string | undefined => {
  return stationMaps[lineId]?.[stationId];
};

const getRailDirection = (
  lineId: string,
  directionId: string,
): string | undefined => {
  return directionMaps[lineId]?.[directionId];
};

const normalizeTrainInformationStatus = (
  rawStatus: string,
  message: string,
): TrainInformationStatus => {
  const combined = `${rawStatus} ${message}`;

  /*
   * Toei 정상 운행 문구.
   *
   * "現在、１５分以上の遅延はありません。"
   *
   * 단순히 "遅延"이라는 단어만 검사하면
   * 정상 상태를 delay로 오판하므로 반드시 먼저 검사한다.
   */
  if (
    combined.includes("遅延はありません") ||
    combined.includes("遅れはありません") ||
    combined.includes("平常どおり") ||
    combined.includes("平常通り") ||
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

  /*
   * 실제 2026-09-07 Toei Asakusa 응답:
   * trainInformationStatus.ja = "ダイヤ乱れ"
   */
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

export const toeiProvider: RailwayProvider = {
  operator: "toei",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Toei Provider]", {
      lineId,
      stationId,
      directionId,
    });

    /*
     * 기존 GUIDE의 다음 도착 기능에는 손대지 않는다.
     * 현재 provider 확장은 StationTimetable 기반 막차 조회용이다.
     */
    return [];
  },

  getTimetable: async ({
    lineId,
    stationId,
    directionId,
  }): Promise<RailwayTimetable[]> => {
    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(`Unsupported Toei railway: ${lineId}`);
    }

    const stationName = getStationName(lineId, stationId);

    if (!stationName) {
      throw new Error(
        `Unsupported Toei station: ${lineId}/${stationId}`,
      );
    }

    const direction = getRailDirection(lineId, directionId);

    if (!direction) {
      throw new Error(
        `Unsupported Toei direction: ${lineId}/${directionId}`,
      );
    }

    const railwayName = getLastSegment(railway);

    if (!railwayName) {
      throw new Error(`Invalid Toei railway: ${railway}`);
    }

    const station =
      `odpt.Station:Toei.${railwayName}.${stationName}`;

    const railDirection =
      direction.startsWith("Toei.")
        ? `odpt.RailDirection:${direction}`
        : `odpt.RailDirection:${direction}`;

    const calendar = `odpt.Calendar:${getCalendar()}`;

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:StationTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Toei",
    );
    url.searchParams.set("odpt:railway", railway);
    url.searchParams.set("odpt:station", station);
    url.searchParams.set(
      "odpt:railDirection",
      railDirection,
    );
    url.searchParams.set("odpt:calendar", calendar);

    console.log("[Toei StationTimetable Request]", {
      lineId,
      stationId,
      directionId,
      railway,
      station,
      railDirection,
      calendar,
      url: url.toString(),
    });

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Toei StationTimetable request failed: ${response.status} ${body}`,
      );
    }

    const data =
      (await response.json()) as OdptStationTimetable[];

    console.log("[Toei StationTimetable Result]", {
      lineId,
      stationId,
      directionId,
      records: data.length,
    });

    const timetable: RailwayTimetable[] = [];

    for (const record of data) {
      const objects =
        record["odpt:stationTimetableObject"] ?? [];

      for (const item of objects) {
        const departureTime = item["odpt:departureTime"];

        if (!departureTime) {
          continue;
        }

        const destination =
          item["odpt:destinationStation"]?.[0];

        const destinationName =
          getLastSegment(destination);

        const trainType =
          getLastSegment(item["odpt:trainType"]);

        timetable.push({
          id:
            item["odpt:trainNumber"] ??
            `${lineId}-${stationId}-${directionId}-${departureTime}`,
          operator: "toei",
          lineId,
          stationId,
          directionId,
          departureTime,
          trainType: trainType ?? "Local",
          destinationKo: destinationName,
          destinationJa: destinationName,
        });
      }
    }

    return timetable;
  },

  getTrainInformation: async ({
    lineId,
  }): Promise<RailwayTrainInformation[]> => {
    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(
        `Unsupported Toei railway: ${lineId}`,
      );
    }

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Toei",
    );

    url.searchParams.set(
      "odpt:railway",
      railway,
    );

    console.log("[Toei TrainInformation Request]", {
      lineId,
      railway,
      url: url.toString(),
    });

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Toei TrainInformation request failed: ${response.status} ${body}`,
      );
    }

    const data =
      (await response.json()) as OdptTrainInformation[];

    console.log("[Toei TrainInformation Result]", {
      lineId,
      railway,
      records: data.length,
    });

    return data.map((item, index) => {
      const message =
        item["odpt:trainInformationText"]?.ja ?? "";

      const rawStatus =
        item["odpt:trainInformationStatus"]?.ja ?? "";

      const cause =
        item["odpt:trainInformationCause"]?.ja;

      const status =
        normalizeTrainInformationStatus(
          rawStatus,
          message,
        );

      return {
        id:
          item["owl:sameAs"] ??
          item["@id"] ??
          `toei-${lineId}-train-information-${index}`,

        operator: "toei",
        lineId,

        status,
        title: getTrainInformationTitle(status),

        message,

        cause,
        rawStatus: rawStatus || undefined,

        updatedAt:
          item["dc:date"] ??
          item["dct:valid"],
      };
    });
  },
};