import * as cheerio from "cheerio";

export type KeiseiAirportService = "skyliner" | "sky-access";
export type KeiseiAirportDayType = "weekday" | "weekend";
export type KeiseiAirportStation = "narita-airport-terminal-1";

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

const KEISEI_TIMETABLE_URL =
  "https://keisei.ekitan.com/naritaacs/timetable/station/682-7/d1?dw=0";

const SERVICE_LABELS: Record<KeiseiAirportService, string> = {
  skyliner: "スカイライナー",
  "sky-access": "アクセス特急",
};

const DAY_CONTAINER: Record<KeiseiAirportDayType, string> = {
  weekday: '[v-show="isWeekday"]',
  weekend: '[v-show="isWeekend"]',
};

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

export async function getKeiseiAirportTimetable(
  service: KeiseiAirportService,
  dayType: KeiseiAirportDayType,
): Promise<KeiseiAirportTimetableResult> {
  const response = await fetch(KEISEI_TIMETABLE_URL, {
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
    station: "narita-airport-terminal-1",
    stationName: "成田空港(成田第１ターミナル)",
    direction: "京成上野・押上・西馬込・京急線方面",
    dayType,
    revisionDate: revisionDate || undefined,
    updatedAt: new Date().toISOString(),
    timetable,
  };
}
