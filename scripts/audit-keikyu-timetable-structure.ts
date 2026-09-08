import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:departureTime"?: string;
  "odpt:arrivalTime"?: string;
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:trainDirection"?: string;
};

type StationTimetableRaw = {
  "@id"?: string;
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
  console.log("Keikyu Timetable Structure Audit");
  console.log("========================================");
  console.log("");

  console.log(`Railway: ${TARGET_RAILWAY}`);
  console.log("");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Keikyu timetable API request failed: ${response.status}`);
  }

  const data = (await response.json()) as StationTimetableRaw[];

  console.log(`Station timetable records: ${data.length}`);
  console.log("");

  if (data.length === 0) {
    console.log("No timetable data found.");
    return;
  }

  let printedCount = 0;

  for (const timetable of data) {
    const objects = timetable["odpt:stationTimetableObject"] ?? [];

    if (objects.length === 0) {
      continue;
    }

    console.log("----------------------------------------");

    console.log(
      `Station: ${
        getShortName(timetable["odpt:station"]) ??
        timetable["odpt:station"] ??
        "unknown"
      }`,
    );

    console.log(
      `Rail direction: ${
        getShortName(timetable["odpt:railDirection"]) ?? "unknown"
      }`,
    );

    console.log(
      `Calendar: ${getShortName(timetable["odpt:calendar"]) ?? "unknown"}`,
    );

    console.log(`Entries: ${objects.length}`);

    console.log("");

    const sampleObjects = objects.slice(0, 5);

    for (let index = 0; index < sampleObjects.length; index += 1) {
      const item = sampleObjects[index];

      console.log(`  [Train ${index + 1}]`);

      console.log(`    departureTime: ${item["odpt:departureTime"] ?? "-"}`);

      console.log(`    arrivalTime: ${item["odpt:arrivalTime"] ?? "-"}`);

      console.log(`    trainNumber: ${item["odpt:trainNumber"] ?? "-"}`);

      console.log(
        `    trainType: ${getShortName(item["odpt:trainType"]) ?? "-"}`,
      );

      console.log(
        `    destination: ${
          getShortNames(item["odpt:destinationStation"]).join(", ") || "-"
        }`,
      );

      console.log(
        `    trainDirection: ${
          getShortName(item["odpt:trainDirection"]) ?? "-"
        }`,
      );

      console.log("");
    }

    printedCount += 1;

    if (printedCount >= 3) {
      break;
    }
  }

  console.log("========================================");
  console.log("Field Availability Audit");
  console.log("========================================");
  console.log("");

  let totalEntries = 0;
  let departureTimeCount = 0;
  let arrivalTimeCount = 0;
  let trainNumberCount = 0;
  let trainTypeCount = 0;
  let destinationCount = 0;
  let trainDirectionCount = 0;

  for (const timetable of data) {
    for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
      totalEntries += 1;

      if (item["odpt:departureTime"]) {
        departureTimeCount += 1;
      }

      if (item["odpt:arrivalTime"]) {
        arrivalTimeCount += 1;
      }

      if (item["odpt:trainNumber"]) {
        trainNumberCount += 1;
      }

      if (item["odpt:trainType"]) {
        trainTypeCount += 1;
      }

      if (
        item["odpt:destinationStation"] &&
        item["odpt:destinationStation"].length > 0
      ) {
        destinationCount += 1;
      }

      if (item["odpt:trainDirection"]) {
        trainDirectionCount += 1;
      }
    }
  }

  const printAvailability = (label: string, count: number) => {
    const percentage = totalEntries === 0 ? 0 : (count / totalEntries) * 100;

    console.log(
      `${label.padEnd(18)} ${count}/${totalEntries} (${percentage.toFixed(
        1,
      )}%)`,
    );
  };

  printAvailability("departureTime", departureTimeCount);

  printAvailability("arrivalTime", arrivalTimeCount);

  printAvailability("trainNumber", trainNumberCount);

  printAvailability("trainType", trainTypeCount);

  printAvailability("destination", destinationCount);

  printAvailability("trainDirection", trainDirectionCount);

  console.log("");
  console.log("========================================");
  console.log("Audit Complete");
  console.log("========================================");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
