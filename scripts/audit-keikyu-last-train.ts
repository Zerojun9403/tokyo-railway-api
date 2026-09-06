import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:departureTime"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
};

type StationTimetableRaw = {
  "odpt:station"?: string;
  "odpt:railway"?: string;
  "odpt:operator"?: string;
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: StationTimetableObjectRaw[];
};

const TARGET_RAILWAY = "odpt.Railway:Keikyu.Main";

const getApiKey = (): string => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error("ODPT_API_KEY is not configured");
  }

  return apiKey;
};

const getShortName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const colonPart = value.split(":").at(-1) ?? value;

  return colonPart.split(".").at(-1) ?? colonPart;
};

const getShortNames = (values?: string[]): string[] => {
  return (values ?? [])
    .map((value) => getShortName(value))
    .filter((value): value is string => value !== null);
};

/*
 * 철도 영업일 기준으로 시간을 비교한다.
 *
 * 23:50 -> 1430
 * 00:10 -> 1450
 * 01:00 -> 1500
 *
 * 새벽 03:00 이전 시간은 전날 운행의 연장으로 취급한다.
 */
const getServiceDayMinutes = (time: string): number => {
  const [hourText, minuteText] = time.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return -1;
  }

  const adjustedHour = hour < 3 ? hour + 24 : hour;

  return adjustedHour * 60 + minute;
};

const main = async () => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
  );

  url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");
  url.searchParams.set("odpt:railway", TARGET_RAILWAY);
  url.searchParams.set("acl:consumerKey", apiKey);

  console.log("");
  console.log("========================================");
  console.log("Keikyu Last Train Audit");
  console.log("========================================");
  console.log("");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Keikyu timetable API request failed: ${response.status}`);
  }

  const data = (await response.json()) as StationTimetableRaw[];

  console.log(`Station timetable records: ${data.length}`);
  console.log("");

  let resultCount = 0;
  let afterMidnightCount = 0;

  for (const timetable of data) {
    const objects = timetable["odpt:stationTimetableObject"] ?? [];

    const departures = objects.filter(
      (
        item,
      ): item is StationTimetableObjectRaw & {
        "odpt:departureTime": string;
      } => !!item["odpt:departureTime"],
    );

    if (departures.length === 0) {
      continue;
    }

    const sorted = [...departures].sort((a, b) => {
      return (
        getServiceDayMinutes(a["odpt:departureTime"]) -
        getServiceDayMinutes(b["odpt:departureTime"])
      );
    });

    const lastTrain = sorted.at(-1);

    if (!lastTrain) {
      continue;
    }

    const station =
      getShortName(timetable["odpt:station"]) ??
      timetable["odpt:station"] ??
      "unknown";

    const direction =
      getShortName(timetable["odpt:railDirection"]) ?? "unknown";

    const calendar = getShortName(timetable["odpt:calendar"]) ?? "unknown";

    const departureTime = lastTrain["odpt:departureTime"];

    const trainType = getShortName(lastTrain["odpt:trainType"]) ?? "unknown";

    const destinations =
      getShortNames(lastTrain["odpt:destinationStation"]).join(", ") ||
      "unknown";

    console.log("----------------------------------------");
    console.log(`Station: ${station}`);
    console.log(`Direction: ${direction}`);
    console.log(`Calendar: ${calendar}`);
    console.log(`Last departure: ${departureTime}`);
    console.log(`Train type: ${trainType}`);
    console.log(`Destination: ${destinations}`);

    const hour = Number(departureTime.split(":")[0]);

    if (hour < 3) {
      afterMidnightCount += 1;

      console.log("*** AFTER MIDNIGHT ***");
    }

    resultCount += 1;
  }

  console.log("");
  console.log("========================================");
  console.log("Summary");
  console.log("========================================");
  console.log("");
  console.log(`Timetables checked: ${resultCount}`);
  console.log(`Last trains after midnight: ${afterMidnightCount}`);
  console.log("");
  console.log("========================================");
  console.log("Audit Complete");
  console.log("========================================");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
