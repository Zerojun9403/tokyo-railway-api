import * as cheerio from "cheerio";

export type KeiseiAirportService = "skyliner" | "sky-access";
export type KeiseiAirportDayType = "weekday" | "weekend";

export type KeiseiAirportStation =
  | "narita-airport-terminal-1"
  | "narita-airport-terminal-2-3"
  | "keisei-ueno"
  | "nippori"
  | "oshiage";

export type KeiseiAirportTimetableItem = {
  departureTime: string;
  trainType: string;
  destination: string;
  firstTrain: boolean;
};

export type KeiseiAirportTimetableResult = {
  operator: "keisei";
  service: KeiseiAirportService;
  station: KeiseiAirportStation;
  stationName: string;
  direction: string;
  dayType: KeiseiAirportDayType;
  revisionDate?: string;
  updatedAt: string;
  timetable: KeiseiAirportTimetableItem[];
};

type StationConfig = {
  url: string;
  stationName: string;
  direction: string;
  supportedServices: KeiseiAirportService[];
};

const STATION_CONFIG: Record<KeiseiAirportStation, StationConfig> = {
  "narita-airport-terminal-1": {
    url: "https://keisei.ekitan.com/naritaacs/timetable/station/682-7/d1?dw=0",
    stationName: "成田空港(成田第１ターミナル)",
    direction: "京成上野・押上・西馬込・京急線方面",
    supportedServices: ["skyliner", "sky-access"],
  },

  "narita-airport-terminal-2-3": {
    url: "https://keisei.ekitan.com/naritaacs/timetable/station/682-6/d1?dw=0",
    stationName: "空港第２ビル(成田第２・第３ターミナル)",
    direction: "京成上野・押上・西馬込・京急線方面",
    supportedServices: ["skyliner", "sky-access"],
  },

  "keisei-ueno": {
    url: "https://keisei.ekitan.com/naritaacs/timetable/station/254-0/d1?dw=0",
    stationName: "京成上野",
    direction: "成田空港方面",
    supportedServices: ["skyliner"],
  },

  nippori: {
    url: "https://keisei.ekitan.com/naritaacs/timetable/station/254-1/d2",
    stationName: "日暮里",
    direction: "成田空港方面",
    supportedServices: ["skyliner"],
  },

  oshiage: {
    url: "https://keisei.ekitan.com/naritaacs/timetable/station/258-0/d1?dw=0",
    stationName: "押上",
    direction: "成田空港・成田スカイアクセス線・北総線方面",
    supportedServices: ["sky-access"],
  },
};

const SERVICE_LABELS: Record<KeiseiAirportService, string> = {
  skyliner: "スカイライナー",
  "sky-access": "アクセス特急",
};

const DAY_CONTAINER: Record<KeiseiAirportDayType, string> = {
  weekday: '[v-show="isWeekday"]',
  weekend: '[v-show="isWeekend"]',
};

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

export const isKeiseiAirportStation = (
  value: string,
): value is KeiseiAirportStation => {
  return Object.prototype.hasOwnProperty.call(STATION_CONFIG, value);
};

export const isServiceSupportedAtStation = (
  station: KeiseiAirportStation,
  service: KeiseiAirportService,
): boolean => {
  return STATION_CONFIG[station].supportedServices.includes(service);
};

export async function getKeiseiAirportTimetable(
  service: KeiseiAirportService,
  dayType: KeiseiAirportDayType,
  station: KeiseiAirportStation = "narita-airport-terminal-1",
): Promise<KeiseiAirportTimetableResult> {
  const stationConfig = STATION_CONFIG[station];

  if (!stationConfig.supportedServices.includes(service)) {
    throw new Error(`${service} is not supported at station ${station}`);
  }

  const response = await fetch(stationConfig.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TokyoRailwayGuide/1.0; timetable parser)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Keisei timetable request failed: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const serviceLabel = SERVICE_LABELS[service];
  const dayContainer = DAY_CONTAINER[dayType];

  const timetable: KeiseiAirportTimetableItem[] = [];

  $(`${dayContainer} li.ekltip`).each((_, element) => {
    const row = $(element);

    const trainType = cleanText(row.find(".ekltraintype").text());

    if (trainType !== serviceLabel) {
      return;
    }

    const departureTime = cleanText(row.find(".ekldeptime").text());

    const destination = cleanText(row.find(".ekldest").text());

    if (!departureTime || !destination) {
      return;
    }

    timetable.push({
      departureTime,
      trainType,
      destination,
      firstTrain: row.find(".eklfirst_train").length > 0,
    });
  });

  const revisionDate = cleanText(
    $(`${dayContainer}.ekrevisiondate, ${dayContainer} .ekrevisiondate`)
      .first()
      .text(),
  );

  return {
    operator: "keisei",
    service,
    station,
    stationName: stationConfig.stationName,
    direction: stationConfig.direction,
    dayType,
    revisionDate: revisionDate || undefined,
    updatedAt: new Date().toISOString(),
    timetable,
  };
}
