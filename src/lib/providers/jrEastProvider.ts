import type {
  RailwayTimetable,
  RailwayTrainInformation,
  TrainInformationStatus,
} from "@/types/railway";
import { jrEastStationNames } from "@/lib/mappings/jrEastStationNames";
import { jrEastTrainTypes } from "@/lib/mappings/jrEastTrainTypes";
import type { RailwayProvider } from "./types";

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const railwayMap: Record<string, string> = {
  yamanote: "odpt.Railway:JR-East.Yamanote",
  "chuo-rapid": "odpt.Railway:JR-East.ChuoRapid",
  "chuo-sobu": "odpt.Railway:JR-East.ChuoSobuLocal",
  "chuo-sobu-local": "odpt.Railway:JR-East.ChuoSobuLocal",
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

const stationMaps: Record<string, Record<string, string>> = {
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
  "saikyo": {
    JA08: "Osaki",
    JA09: "Ebisu",
    JA10: "Shibuya",
    JA11: "Shinjuku",
    JA12: "Ikebukuro",
    JA13: "Itabashi",
    JA14: "Jujo",
    JA15: "Akabane",
    JA16: "KitaAkabane",
    JA17: "Ukimafunado",
    JA18: "TodaKoen",
    JA19: "Toda",
    JA20: "KitaToda",
    JA21: "MusashiUrawa",
    JA22: "NakaUrawa",
    JA23: "MinamiYono",
    JA24: "YonoHommachi",
    JA25: "KitaYono",
    JA26: "Omiya",
  },
  "chuo-rapid": {
    JC01: "Tokyo",
    JC02: "Kanda",
    JC03: "Ochanomizu",
    JC04: "Yotsuya",
    JC05: "Shinjuku",
    JC06: "Nakano",
    JC07: "Koenji",
    JC08: "Asagaya",
    JC09: "Ogikubo",
    JC10: "NishiOgikubo",
    JC11: "Kichijoji",
    JC12: "Mitaka",
    JC13: "MusashiSakai",
    JC14: "HigashiKoganei",
    JC15: "MusashiKoganei",
    JC16: "Kokubunji",
    JC17: "NishiKokubunji",
    JC18: "Kunitachi",
    JC19: "Tachikawa",
    JC20: "Hino",
    JC21: "Toyoda",
    JC22: "Hachioji",
    JC23: "NishiHachioji",
    JC24: "Takao",
  },
  "chuo-sobu": {
    JB01: "Mitaka",
    JB02: "Kichijoji",
    JB03: "NishiOgikubo",
    JB04: "Ogikubo",
    JB05: "Asagaya",
    JB06: "Koenji",
    JB07: "Nakano",
    JB08: "HigashiNakano",
    JB09: "Okubo",
    JB10: "Shinjuku",
    JB11: "Yoyogi",
    JB12: "Sendagaya",
    JB13: "Shinanomachi",
    JB14: "Yotsuya",
    JB15: "Ichigaya",
    JB16: "Iidabashi",
    JB17: "Suidobashi",
    JB18: "Ochanomizu",
    JB19: "Akihabara",
    JB20: "Asakusabashi",
    JB21: "Ryogoku",
    JB22: "Kinshicho",
    JB23: "Kameido",
    JB24: "Hirai",
    JB25: "ShinKoiwa",
    JB26: "Koiwa",
    JB27: "Ichikawa",
    JB28: "MotoYawata",
    JB29: "ShimosaNakayama",
    JB30: "NishiFunabashi",
    JB31: "Funabashi",
    JB32: "HigashiFunabashi",
    JB33: "Tsudanuma",
    JB34: "MakuhariHongo",
    JB35: "Makuhari",
    JB36: "ShinKemigawa",
    JB37: "Inage",
    JB38: "NishiChiba",
    JB39: "Chiba",
  },

  "chuo-sobu-local": {
    JB01: "Mitaka",
    JB02: "Kichijoji",
    JB03: "NishiOgikubo",
    JB04: "Ogikubo",
    JB05: "Asagaya",
    JB06: "Koenji",
    JB07: "Nakano",
    JB08: "HigashiNakano",
    JB09: "Okubo",
    JB10: "Shinjuku",
    JB11: "Yoyogi",
    JB12: "Sendagaya",
    JB13: "Shinanomachi",
    JB14: "Yotsuya",
    JB15: "Ichigaya",
    JB16: "Iidabashi",
    JB17: "Suidobashi",
    JB18: "Ochanomizu",
    JB19: "Akihabara",
    JB20: "Asakusabashi",
    JB21: "Ryogoku",
    JB22: "Kinshicho",
    JB23: "Kameido",
    JB24: "Hirai",
    JB25: "ShinKoiwa",
    JB26: "Koiwa",
    JB27: "Ichikawa",
    JB28: "MotoYawata",
    JB29: "ShimosaNakayama",
    JB30: "NishiFunabashi",
    JB31: "Funabashi",
    JB32: "HigashiFunabashi",
    JB33: "Tsudanuma",
    JB34: "MakuhariHongo",
    JB35: "Makuhari",
    JB36: "ShinKemigawa",
    JB37: "Inage",
    JB38: "NishiChiba",
    JB39: "Chiba",
  },
  "shonan-shinjuku": {
    JS09: "Ofuna",
    JS10: "Totsuka",
    JS11: "HigashiTotsuka",
    JS12: "Hodogaya",
    JS13: "Yokohama",
    JS14: "ShinKawasaki",
    JS15: "MusashiKosugi",
    JS16: "NishiOi",
    JS17: "Osaki",
    JS18: "Ebisu",
    JS19: "Shibuya",
    JS20: "Shinjuku",
    JS21: "Ikebukuro",
    JS22: "Akabane",
    JS23: "Urawa",
    JS24: "Omiya",
  },
  tokaido: {
    JT01: "Tokyo",
    JT02: "Shimbashi",
    JT03: "Shinagawa",
    JT04: "Kawasaki",
    JT05: "Yokohama",
    JT06: "Totsuka",
    JT07: "Ofuna",
    JT08: "Fujisawa",
    JT09: "Tsujido",
    JT10: "Chigasaki",
    JT11: "Hiratsuka",
    JT12: "Oiso",
    JT13: "Ninomiya",
    JT14: "Kozu",
    JT15: "Kamonomiya",
    JT16: "Odawara",
    JT17: "Hayakawa",
    JT18: "Nebukawa",
    JT19: "Manazuru",
    JT20: "Yugawara",
    JT21: "Atami",
  },
  "keihin-tohoku": {
    JK47: "Omiya",
    JK46: "SaitamaShintoshin",
    JK45: "Yono",
    JK44: "KitaUrawa",
    JK43: "Urawa",
    JK42: "MinamiUrawa",
    JK41: "Warabi",
    JK40: "NishiKawaguchi",
    JK39: "Kawaguchi",
    JK38: "Akabane",
    JK37: "HigashiJujo",
    JK36: "Oji",
    JK35: "Kaminakazato",
    JK34: "Tabata",
    JK33: "NishiNippori",
    JK32: "Nippori",
    JK31: "Uguisudani",
    JK30: "Ueno",
    JK29: "Okachimachi",
    JK28: "Akihabara",
    JK27: "Kanda",
    JK26: "Tokyo",
    JK25: "Yurakucho",
    JK24: "Shimbashi",
    JK23: "Hamamatsucho",
    JK22: "Tamachi",
    JK21: "TakanawaGateway",
    JK20: "Shinagawa",
    JK19: "Oimachi",
    JK18: "Omori",
    JK17: "Kamata",
    JK16: "Kawasaki",
    JK15: "Tsurumi",
    JK14: "ShinKoyasu",
    JK13: "HigashiKanagawa",
    JK12: "Yokohama",
    JK11: "Sakuragicho",
    JK10: "Kannai",
    JK09: "Ishikawacho",
    JK08: "Yamate",
    JK07: "Negishi",
    JK06: "Isogo",
    JK05: "ShinSugita",
    JK04: "Yokodai",
    JK03: "Konandai",
    JK02: "Hongodai",
    JK01: "Ofuna",
  },

  keiyo: {
    JE01: "Tokyo",
    JE02: "Hatchobori",
  },
  "yokosuka": {
    JO01: "Kurihama",
    JO02: "Kinugasa",
    JO03: "Yokosuka",
    JO04: "Taura",
    JO05: "HigashiZushi",
    JO06: "Zushi",
    JO07: "Kamakura",
    JO08: "KitaKamakura",
    JO09: "Ofuna",
    JO10: "Totsuka",
    JO11: "HigashiTotsuka",
    JO12: "Hodogaya",
    JO13: "Yokohama",
    JO14: "ShinKawasaki",
    JO15: "MusashiKosugi",
    JO16: "NishiOi",
    JO17: "Shinagawa",
    JO18: "Shimbashi",
    JO19: "Tokyo",
  },
  "sobu": {
    JO28: "Chiba",
    JO29: "HigashiChiba",
    JO30: "Tsuga",
    JO31: "Yotsukaido",
    JO32: "Monoi",
    JO33: "Sakura",
    JO34: "Shisui",
    JO35: "Narita",
    JO36: "NaritaAirportTerminal2and3",
    JO37: "NaritaAirportTerminal1",
  },
  "sobu-rapid": {
    JO19: "Tokyo",
    JO20: "ShinNihombashi",
    JO21: "Bakurocho",
    JO22: "Kinshicho",
    JO23: "ShinKoiwa",
    JO24: "Ichikawa",
    JO25: "Funabashi",
    JO26: "Tsudanuma",
    JO27: "Inage",
    JO28: "Chiba",
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

type OdptTrainTimetableObject = {
  "odpt:arrivalTime"?: string;
  "odpt:departureTime"?: string;
  "odpt:arrivalStation"?: string;
  "odpt:departureStation"?: string;
};

type OdptTrainTimetable = {
  "odpt:trainNumber"?: string;
  "odpt:railDirection"?: string;
  "odpt:trainTimetableObject"?: OdptTrainTimetableObject[];
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

const getLastSegment = (value?: string): string | undefined => {
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

  if (combined.includes("遅延") || combined.includes("遅れ")) {
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

  if (status.includes("お知らせ") || status.includes("情報")) {
    return "information";
  }

  if (status || text) {
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


const getTerminalArrivalTimetable = async ({
  apiKey,
  railway,
  station,
  railDirection,
  lineId,
  stationId,
  directionId,
}: {
  apiKey: string;
  railway: string;
  station: string;
  railDirection: string;
  lineId: string;
  stationId: string;
  directionId: string;
}): Promise<RailwayTimetable[]> => {
  const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainTimetable`);

  url.searchParams.set("odpt:operator", "odpt.Operator:JR-East");
  url.searchParams.set("odpt:railway", railway);
  url.searchParams.set("odpt:railDirection", railDirection);
  url.searchParams.set("acl:consumerKey", apiKey);

  console.log("[JR East Provider] TrainTimetable fallback request", {
    lineId,
    stationId,
    station,
    directionId,
    railDirection,
  });

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `JR East TrainTimetable request failed: ${response.status} ${response.statusText} - ${errorBody}`,
    );
  }

  const data = (await response.json()) as OdptTrainTimetable[];
  const seen = new Set<string>();

  const timetable: RailwayTimetable[] = data.flatMap((train, trainIndex) => {
    if (train["odpt:railDirection"] !== railDirection) return [];

    const trainNumber = train["odpt:trainNumber"];
    const objects = train["odpt:trainTimetableObject"] ?? [];

    const stationObject = objects.find(
      (item) =>
        item["odpt:arrivalStation"] === station ||
        item["odpt:departureStation"] === station,
    );

    if (!stationObject) return [];

    const arrivalTime =
      stationObject["odpt:arrivalTime"] ??
      stationObject["odpt:departureTime"];

    if (!arrivalTime) return [];

    const dedupeKey = `${trainNumber ?? "unknown"}|${arrivalTime}`;
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);

    return [{
      id:
        `jr-east-${lineId}-${stationId}-` +
        `${directionId}-${arrivalTime}-train-${trainIndex}`,
      operator: "jr-east",
      lineId,
      stationId,
      directionId,
      departureTime: arrivalTime,
      trainNumber,
    }];
  });

  timetable.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

  console.log("[JR East Provider] TrainTimetable fallback result", {
    lineId,
    stationId,
    directionId,
    count: timetable.length,
  });

  return timetable;
};

export const jrEastProvider: RailwayProvider = {
  operator: "jr-east",

  getTrains: async ({ lineId, stationId, directionId }) => {
    console.log("[JR East Provider] getTrains", {
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
      throw new Error(`Unsupported JR East lineId: ${lineId}`);
    }

    const railwayName = railway.replace("odpt.Railway:", "");

    const stationName = stationMaps[lineId]?.[stationId] ?? stationId;

    const station = `odpt.Station:${railwayName}.${stationName}`;

    const railDirection = `odpt.RailDirection:${directionId}`;

    const calendar = `odpt.Calendar:${getCalendar()}`;

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:StationTimetable`);

    url.searchParams.set("odpt:operator", "odpt.Operator:JR-East");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("odpt:station", station);

    url.searchParams.set("odpt:railDirection", railDirection);

    url.searchParams.set("odpt:calendar", calendar);

    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("[JR East Provider] timetable request failed", {
        status: response.status,
        statusText: response.statusText,
        railway,
        station,
        railDirection,
        calendar,
        errorBody,
      });

      throw new Error(
        `JR East timetable request failed: ${response.status} ${response.statusText} - ${errorBody}`,
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

          const destinationStation = getLastSegment(
            item["odpt:destinationStation"]?.[0],
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
              trainNumber: item["odpt:trainNumber"],
              destinationStation,
              destinationKo: destinationName?.ko,
              destinationJa: destinationName?.ja,
            },
          ];
        });
      },
    );

    if (timetable.length > 0) {
      return timetable;
    }

    /*
     * 종착역은 같은 방향의 StationTimetable 출발 데이터가 비어 있을 수 있다.
     * 이 경우 TrainTimetable에서 해당 역의 실제 arrivalTime을 사용한다.
     */
    return getTerminalArrivalTimetable({
      apiKey,
      railway,
      station,
      railDirection,
      lineId,
      stationId,
      directionId,
    });
  },

  getTrainInformation: async ({ lineId }) => {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      throw new Error("ODPT_API_KEY is not configured.");
    }

    const railway = railwayMap[lineId];

    if (!railway) {
      throw new Error(`Unsupported JR East lineId: ${lineId}`);
    }

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainInformation`);

    url.searchParams.set("odpt:operator", "odpt.Operator:JR-East");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error("[JR East Provider] train information request failed", {
        status: response.status,
        statusText: response.statusText,
        railway,
        errorBody,
      });

      throw new Error(
        `JR East train information request failed: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const data = (await response.json()) as OdptTrainInformation[];

    const information: RailwayTrainInformation[] = data.map((item, index) => {
      const rawStatus = item["odpt:trainInformationStatus"];

      const message = item["odpt:trainInformationText"] ?? "";

      const status = normalizeTrainInformationStatus(rawStatus, message);

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
        cause: item["odpt:trainInformationCause"],
        affectedSection: item["odpt:trainInformationRange"],
        rawStatus,
        updatedAt: item["dc:date"] ?? item["dct:valid"],
      };
    });

    return information;
  },
};
