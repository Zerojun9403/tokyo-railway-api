import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
import type { RailwayProvider } from "./types";
import { getOdptDestinationNameKo } from "./odptDestinationNames";

const ODPT_API_BASE_URL = "https://api.odpt.org/api/v4";

/*
 * =========================================================
 * Railway
 * =========================================================
 */

const railwayMap: Record<string, string> = {
  ginza: "odpt.Railway:TokyoMetro.Ginza",
  marunouchi: "odpt.Railway:TokyoMetro.Marunouchi",
  hibiya: "odpt.Railway:TokyoMetro.Hibiya",
  tozai: "odpt.Railway:TokyoMetro.Tozai",
  chiyoda: "odpt.Railway:TokyoMetro.Chiyoda",
  yurakucho: "odpt.Railway:TokyoMetro.Yurakucho",
  hanzomon: "odpt.Railway:TokyoMetro.Hanzomon",
  namboku: "odpt.Railway:TokyoMetro.Namboku",
  fukutoshin: "odpt.Railway:TokyoMetro.Fukutoshin",
};

/*
 * =========================================================
 * Station Maps
 * =========================================================
 */

const ginzaStationMap: Record<string, string> = {
  G01: "Shibuya",
  G02: "OmoteSando",
  G03: "Gaiemmae",
  G04: "AoyamaItchome",
  G05: "AkasakaMitsuke",
  G06: "TameikeSanno",
  G07: "Toranomon",
  G08: "Shimbashi",
  G09: "Ginza",
  G10: "Kyobashi",
  G11: "Nihombashi",
  G12: "Mitsukoshimae",
  G13: "Kanda",
  G14: "Suehirocho",
  G15: "UenoHiroKoji",
  G16: "Ueno",
  G17: "Inaricho",
  G18: "Tawaramachi",
  G19: "Asakusa",
};

const marunouchiStationMap: Record<string, string> = {
  M01: "Ogikubo",
  M02: "MinamiAsagaya",
  M03: "ShinKoenji",
  M04: "HigashiKoenji",
  M05: "ShinNakano",
  M06: "NakanoSakaue",
  M07: "NishiShinjuku",
  M08: "Shinjuku",
  M09: "ShinjukuSanchome",
  M10: "ShinjukuGyoemmae",
  M11: "YotsuyaSanchome",
  M12: "Yotsuya",
  M13: "AkasakaMitsuke",
  M14: "KokkaiGijidomae",
  M15: "Kasumigaseki",
  M16: "Ginza",
  M17: "Tokyo",
  M18: "Otemachi",
  M19: "Awajicho",
  M20: "Ochanomizu",
  M21: "HongoSanchome",
  M22: "Korakuen",
  M23: "Myogadani",
  M24: "ShinOtsuka",
  M25: "Ikebukuro",
};

const hibiyaStationMap: Record<string, string> = {
  H01: "NakaMeguro",
  H02: "Ebisu",
  H03: "HiroO",
  H04: "Roppongi",
  H05: "Kamiyacho",
  H06: "ToranomonHills",
  H07: "Kasumigaseki",
  H08: "Hibiya",
  H09: "Ginza",
  H10: "HigashiGinza",
  H11: "Tsukiji",
  H12: "Hatchobori",
  H13: "Kayabacho",
  H14: "Ningyocho",
  H15: "Kodemmacho",
  H16: "Akihabara",
  H17: "NakaOkachimachi",
  H18: "Ueno",
  H19: "Iriya",
  H20: "Minowa",
  H21: "MinamiSenju",
  H22: "KitaSenju",
};

const tozaiStationMap: Record<string, string> = {
  T01: "Nakano",
  T02: "Ochiai",
  T03: "Takadanobaba",
  T04: "Waseda",
  T05: "Kagurazaka",
  T06: "Iidabashi",
  T07: "Kudanshita",
  T08: "Takebashi",
  T09: "Otemachi",
  T10: "Nihombashi",
  T11: "Kayabacho",
  T12: "MonzenNakacho",
  T13: "Kiba",
  T14: "Toyocho",
  T15: "MinamiSunamachi",
  T16: "NishiKasai",
  T17: "Kasai",
  T18: "Urayasu",
  T19: "MinamiGyotoku",
  T20: "Gyotoku",
  T21: "Myoden",
  T22: "BarakiNakayama",
  T23: "NishiFunabashi",
};

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

const yurakuchoStationMap: Record<string, string> = {
  Y01: "Wakoshi",
  Y02: "ChikatetsuNarimasu",
  Y03: "ChikatetsuAkatsuka",
  Y04: "Heiwadai",
  Y05: "Hikawadai",
  Y06: "KotakeMukaihara",
  Y07: "Senkawa",
  Y08: "Kanamecho",
  Y09: "Ikebukuro",
  Y10: "HigashiIkebukuro",
  Y11: "Gokokuji",
  Y12: "Edogawabashi",
  Y13: "Iidabashi",
  Y14: "Ichigaya",
  Y15: "Kojimachi",
  Y16: "Nagatacho",
  Y17: "Sakuradamon",
  Y18: "Yurakucho",
  Y19: "GinzaItchome",
  Y20: "Shintomicho",
  Y21: "Tsukishima",
  Y22: "Toyosu",
  Y23: "Tatsumi",
  Y24: "ShinKiba",
};

const hanzomonStationMap: Record<string, string> = {
  Z01: "Shibuya",
  Z02: "OmoteSando",
  Z03: "AoyamaItchome",
  Z04: "Nagatacho",
  Z05: "Hanzomon",
  Z06: "Kudanshita",
  Z07: "Jimbocho",
  Z08: "Otemachi",
  Z09: "Mitsukoshimae",
  Z10: "Suitengumae",
  Z11: "KiyosumiShirakawa",
  Z12: "Sumiyoshi",
  Z13: "Kinshicho",
  Z14: "Oshiage",
};

const nambokuStationMap: Record<string, string> = {
  N01: "Meguro",
  N02: "Shirokanedai",
  N03: "ShirokaneTakanawa",
  N04: "AzabuJuban",
  N05: "RoppongiItchome",
  N06: "TameikeSanno",
  N07: "Nagatacho",
  N08: "Yotsuya",
  N09: "Ichigaya",
  N10: "Iidabashi",
  N11: "Korakuen",
  N12: "Todaimae",
  N13: "HonKomagome",
  N14: "Komagome",
  N15: "Nishigahara",
  N16: "Oji",
  N17: "OjiKamiya",
  N18: "Shimo",
  N19: "AkabaneIwabuchi",
};

const fukutoshinStationMap: Record<string, string> = {
  F01: "Wakoshi",
  F02: "ChikatetsuNarimasu",
  F03: "ChikatetsuAkatsuka",
  F04: "Heiwadai",
  F05: "Hikawadai",
  F06: "KotakeMukaihara",
  F07: "Senkawa",
  F08: "Kanamecho",
  F09: "Ikebukuro",
  F10: "Zoshigaya",
  F11: "NishiWaseda",
  F12: "HigashiShinjuku",
  F13: "ShinjukuSanchome",
  F14: "KitaSando",
  F15: "MeijiJingumae",
  F16: "Shibuya",
};

const stationMaps: Record<string, Record<string, string>> = {
  ginza: ginzaStationMap,
  marunouchi: marunouchiStationMap,
  hibiya: hibiyaStationMap,
  tozai: tozaiStationMap,
  chiyoda: chiyodaStationMap,
  yurakucho: yurakuchoStationMap,
  hanzomon: hanzomonStationMap,
  namboku: nambokuStationMap,
  fukutoshin: fukutoshinStationMap,
};

/*
 * =========================================================
 * Direction Maps
 * =========================================================
 *
 * GUIDE directionId -> ODPT RailDirection
 *
 * 실제 Tokyo Metro StationTimetable 응답으로 확인한 방향값.
 */

const directionMaps: Record<string, Record<string, string>> = {
  ginza: {
    asakusa: "TokyoMetro.Asakusa",
    shibuya: "TokyoMetro.Shibuya",
  },

  marunouchi: {
    ogikubo: "TokyoMetro.Ogikubo",
    ikebukuro: "TokyoMetro.Ikebukuro",
  },

  hibiya: {
    nakameguro: "TokyoMetro.NakaMeguro",
    kitasenju: "TokyoMetro.KitaSenju",
  },

  tozai: {
    nakano: "TokyoMetro.Nakano",
    nishifunabashi: "TokyoMetro.NishiFunabashi",
  },

  chiyoda: {
    yoyogiuehara: "TokyoMetro.YoyogiUehara",
    kitaayase: "TokyoMetro.KitaAyase",
  },

  yurakucho: {
    wakoshi: "TokyoMetro.Wakoshi",
    shinkiba: "TokyoMetro.ShinKiba",
  },

  hanzomon: {
    shibuya: "TokyoMetro.Shibuya",
    oshiage: "TokyoMetro.Oshiage",
  },

  namboku: {
    meguro: "TokyoMetro.Meguro",
    akabaneiwabuchi: "TokyoMetro.AkabaneIwabuchi",
  },

  fukutoshin: {
    wakoshi: "TokyoMetro.Wakoshi",
    shibuya: "TokyoMetro.Shibuya",
  },
};

/*
 * =========================================================
 * ODPT Types
 * =========================================================
 */

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

type OdptTrainInformationText = {
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
  "odpt:trainInformationStatus"?: string | OdptTrainInformationText;
  "odpt:trainInformationText"?: string | OdptTrainInformationText;
  "odpt:trainInformationCause"?: string | OdptTrainInformationText;
  "odpt:trainInformationRange"?: string | OdptTrainInformationText;
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

const getStationName = (lineId: string, stationId: string): string => {
  const stationMap = stationMaps[lineId];

  if (!stationMap) {
    throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
  }

  const stationName = stationMap[stationId];

  if (!stationName) {
    throw new Error(
      `Unsupported Tokyo Metro ${lineId} stationId: ${stationId}`,
    );
  }

  return stationName;
};

const getRailDirection = (lineId: string, directionId: string): string => {
  const directionMap = directionMaps[lineId];

  if (!directionMap) {
    throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
  }

  const direction = directionMap[directionId];

  if (!direction) {
    throw new Error(
      `Unsupported Tokyo Metro ${lineId} directionId: ${directionId}`,
    );
  }

  return direction;
};

const getJapaneseText = (
  value?: string | OdptTrainInformationText,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.ja ?? value.en;
};

const normalizeTrainInformationStatus = (
  rawStatus?: string,
  message?: string,
): TrainInformationStatus => {
  const text = `${rawStatus ?? ""} ${message ?? ""}`;

  if (text.includes("運転見合わせ") || text.includes("運転を見合わせ")) {
    return "suspended";
  }
  if (text.includes("一部運休") || text.includes("一部列車運休")) {
    return "partial-suspension";
  }
  if (text.includes("直通運転中止") || text.includes("直通運転を中止")) {
    return "through-service-suspended";
  }
  if (text.includes("運転再開見込") || text.includes("運転再開見込み")) {
    return "resuming";
  }
  if (text.includes("遅延") || text.includes("遅れ")) {
    return "delay";
  }
  if (
    text.includes("平常どおり") ||
    text.includes("平常通り") ||
    text.includes("通常どおり") ||
    text.includes("通常通り")
  ) {
    return "normal";
  }
  if (rawStatus?.includes("お知らせ") || rawStatus?.includes("情報")) {
    return "information";
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

/*
 * =========================================================
 * Provider
 * =========================================================
 */

export const tokyoMetroProvider: RailwayProvider = {
  operator: "tokyo-metro",

  /*
   * 기존 GUIDE의 Tokyo Metro 다음 도착 기능은
   * 별도 서비스(tokyo-metro-app.vercel.app)를 사용한다.
   *
   * 따라서 여기의 getTrains는 기존대로 유지한다.
   */

  getTrains: async ({ lineId, stationId, directionId }) => {
    console.log("[Tokyo Metro Provider] getTrains", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },

  /*
   * =======================================================
   * Train Information
   * =======================================================
   */

  getTrainInformation: async ({ lineId }) => {
    const apiKey = process.env.TOKYO_METRO_API_KEY;

    if (!apiKey) {
      throw new Error("TOKYO_METRO_API_KEY is not configured.");
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
    }

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainInformation`);
    url.searchParams.set("odpt:operator", "odpt.Operator:TokyoMetro");
    url.searchParams.set("odpt:railway", railway);
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const body = await response.text();
      console.error("[Tokyo Metro Provider] TrainInformation request failed", {
        lineId,
        railway,
        status: response.status,
        statusText: response.statusText,
        body,
      });
      throw new Error(
        `Tokyo Metro train information request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as OdptTrainInformation[];

    const information: RailwayTrainInformation[] = data.map((item, index) => {
      const message = getJapaneseText(item["odpt:trainInformationText"]) ?? "";
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
          `tokyo-metro-${lineId}-train-information-${index}`,
        operator: "tokyo-metro",
        lineId,
        status,
        title: getTrainInformationTitle(status),
        message,
        cause,
        affectedSection,
        rawStatus,
        updatedAt: item["dc:date"] ?? item["dct:valid"],
      };
    });

    console.log("[Tokyo Metro Provider] TrainInformation result", {
      lineId,
      railway,
      count: information.length,
    });

    return information;
  },

  /*
   * =======================================================
   * Station Timetable / Last Train
   * =======================================================
   */

  getTimetable: async ({ lineId, stationId, directionId }) => {
    const apiKey = process.env.TOKYO_METRO_API_KEY;

    if (!apiKey) {
      throw new Error("TOKYO_METRO_API_KEY is not configured.");
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(`Unsupported Tokyo Metro lineId: ${lineId}`);
    }

    const stationName = getStationName(lineId, stationId);

    const direction = getRailDirection(lineId, directionId);

    /*
     * odpt.Railway:TokyoMetro.Ginza
     * ->
     * Ginza
     */

    const railwayName = getLastSegment(railway);

    if (!railwayName) {
      throw new Error(`Invalid Tokyo Metro railway: ${railway}`);
    }

    /*
     * 노선별 ODPT Station ID 생성
     *
     * Ginza:
     * odpt.Station:TokyoMetro.Ginza.Ginza
     *
     * Yurakucho:
     * odpt.Station:TokyoMetro.Yurakucho.Yurakucho
     *
     * Chiyoda:
     * odpt.Station:TokyoMetro.Chiyoda.Akasaka
     */

    const station = `odpt.Station:TokyoMetro.${railwayName}.${stationName}`;

    const railDirection = `odpt.RailDirection:${direction}`;

    const calendar = `odpt.Calendar:${getCalendar()}`;

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:StationTimetable`);

    url.searchParams.set("odpt:operator", "odpt.Operator:TokyoMetro");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("odpt:station", station);

    url.searchParams.set("odpt:railDirection", railDirection);

    url.searchParams.set("odpt:calendar", calendar);

    url.searchParams.set("acl:consumerKey", apiKey);

    console.log("[Tokyo Metro Provider] StationTimetable request", {
      lineId,
      stationId,
      station,
      directionId,
      railDirection,
      calendar,
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Tokyo Metro timetable request failed: ${response.status} ${response.statusText}`,
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

          const destinationStationFull = item["odpt:destinationStation"]?.[0];

          const destinationStation = getLastSegment(destinationStationFull);

          const destinationNameKo = getOdptDestinationNameKo(
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

              destinationKo: destinationNameKo ?? destinationStation,

              destinationJa: destinationStation,
            },
          ];
        });
      },
    );

    console.log("[Tokyo Metro Provider] StationTimetable result", {
      lineId,
      stationId,
      directionId,
      count: timetable.length,
    });

    return timetable;
  },
};
