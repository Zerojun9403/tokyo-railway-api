import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type TrainTimetableObjectRaw = {
  "odpt:arrivalTime"?: string;
  "odpt:departureTime"?: string;
  "odpt:arrivalStation"?: string;
  "odpt:departureStation"?: string;
};

type TrainTimetableRaw = {
  "@id"?: string;
  "@type"?: string;

  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:calendar"?: string;

  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:train"?: string;

  "odpt:railDirection"?: string;
  "odpt:destinationStation"?: string[];

  "odpt:trainTimetableObject"?: TrainTimetableObjectRaw[];
};

const KEIKYU_RAILWAYS = [
  "odpt.Railway:Keikyu.Main",
  "odpt.Railway:Keikyu.Airport",
  "odpt.Railway:Keikyu.Kurihama",
  "odpt.Railway:Keikyu.Zushi",
  "odpt.Railway:Keikyu.Daishi",
];

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

const fetchTrainTimetable = async (
  railway: string,
): Promise<TrainTimetableRaw[]> => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:TrainTimetable",
  );

  url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");

  url.searchParams.set("odpt:railway", railway);

  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      [
        `Keikyu TrainTimetable API request failed`,
        `Railway: ${railway}`,
        `Status: ${response.status}`,
        `Response: ${body.slice(0, 500)}`,
      ].join("\n"),
    );
  }

  return (await response.json()) as TrainTimetableRaw[];
};

const printSampleTrain = (train: TrainTimetableRaw, index: number) => {
  console.log("----------------------------------------");

  console.log(`Train ${index + 1}`);

  console.log(`trainNumber: ${train["odpt:trainNumber"] ?? "-"}`);

  console.log(`trainType: ${getShortName(train["odpt:trainType"]) ?? "-"}`);

  console.log(`train: ${getShortName(train["odpt:train"]) ?? "-"}`);

  console.log(
    `railDirection: ${getShortName(train["odpt:railDirection"]) ?? "-"}`,
  );

  console.log(`calendar: ${getShortName(train["odpt:calendar"]) ?? "-"}`);

  console.log(
    `destination: ${
      getShortNames(train["odpt:destinationStation"]).join(", ") || "-"
    }`,
  );

  const timetableObjects = train["odpt:trainTimetableObject"] ?? [];

  console.log(`timetableObjects: ${timetableObjects.length}`);

  console.log("");

  if (timetableObjects.length === 0) {
    console.log("  No trainTimetableObject entries.");

    console.log("");

    return;
  }

  for (
    let objectIndex = 0;
    objectIndex < timetableObjects.length;
    objectIndex += 1
  ) {
    const item = timetableObjects[objectIndex];

    const arrivalStation = getShortName(item["odpt:arrivalStation"]);

    const departureStation = getShortName(item["odpt:departureStation"]);

    console.log(`  [Stop ${objectIndex + 1}]`);

    console.log(`    arrivalStation: ${arrivalStation ?? "-"}`);

    console.log(`    arrivalTime: ${item["odpt:arrivalTime"] ?? "-"}`);

    console.log(`    departureStation: ${departureStation ?? "-"}`);

    console.log(`    departureTime: ${item["odpt:departureTime"] ?? "-"}`);
  }

  console.log("");
};

const printFieldAvailability = (data: TrainTimetableRaw[]) => {
  let trainNumberCount = 0;
  let trainTypeCount = 0;
  let directionCount = 0;
  let destinationCount = 0;
  let timetableObjectCount = 0;

  let arrivalStationCount = 0;
  let departureStationCount = 0;
  let arrivalTimeCount = 0;
  let departureTimeCount = 0;

  let totalObjects = 0;

  for (const train of data) {
    if (train["odpt:trainNumber"]) {
      trainNumberCount += 1;
    }

    if (train["odpt:trainType"]) {
      trainTypeCount += 1;
    }

    if (train["odpt:railDirection"]) {
      directionCount += 1;
    }

    if (
      train["odpt:destinationStation"] &&
      train["odpt:destinationStation"].length > 0
    ) {
      destinationCount += 1;
    }

    const objects = train["odpt:trainTimetableObject"] ?? [];

    if (objects.length > 0) {
      timetableObjectCount += 1;
    }

    for (const item of objects) {
      totalObjects += 1;

      if (item["odpt:arrivalStation"]) {
        arrivalStationCount += 1;
      }

      if (item["odpt:departureStation"]) {
        departureStationCount += 1;
      }

      if (item["odpt:arrivalTime"]) {
        arrivalTimeCount += 1;
      }

      if (item["odpt:departureTime"]) {
        departureTimeCount += 1;
      }
    }
  }

  const printTrainAvailability = (label: string, count: number) => {
    const percentage = data.length === 0 ? 0 : (count / data.length) * 100;

    console.log(
      `${label.padEnd(22)} ${count}/${data.length} (${percentage.toFixed(1)}%)`,
    );
  };

  const printObjectAvailability = (label: string, count: number) => {
    const percentage = totalObjects === 0 ? 0 : (count / totalObjects) * 100;

    console.log(
      `${label.padEnd(22)} ${count}/${totalObjects} (${percentage.toFixed(
        1,
      )}%)`,
    );
  };

  console.log("Train-level fields:");

  printTrainAvailability("trainNumber", trainNumberCount);

  printTrainAvailability("trainType", trainTypeCount);

  printTrainAvailability("railDirection", directionCount);

  printTrainAvailability("destination", destinationCount);

  printTrainAvailability("timetableObject", timetableObjectCount);

  console.log("");
  console.log(`Total timetable objects: ${totalObjects}`);
  console.log("");

  console.log("Stop-level fields:");

  printObjectAvailability("arrivalStation", arrivalStationCount);

  printObjectAvailability("departureStation", departureStationCount);

  printObjectAvailability("arrivalTime", arrivalTimeCount);

  printObjectAvailability("departureTime", departureTimeCount);
};

const main = async () => {
  console.log("");
  console.log("========================================");

  console.log("Keikyu TrainTimetable Discovery Audit");

  console.log("========================================");

  console.log("");

  let totalRecords = 0;

  for (const railway of KEIKYU_RAILWAYS) {
    console.log("========================================");

    console.log(getShortName(railway) ?? railway);

    console.log("========================================");

    console.log("");

    console.log(`[FETCH] ${railway}`);

    let data: TrainTimetableRaw[];

    try {
      data = await fetchTrainTimetable(railway);
    } catch (error) {
      console.log("");

      console.log("[FAILED]");

      console.log(error instanceof Error ? error.message : error);

      console.log("");

      continue;
    }

    totalRecords += data.length;

    console.log(`[OK] ${data.length} TrainTimetable records`);

    console.log("");

    if (data.length === 0) {
      console.log("No TrainTimetable data found.");

      console.log("");

      continue;
    }

    console.log("========================================");

    console.log("Sample Trains");

    console.log("========================================");

    console.log("");

    const interestingTrain =
      data.find((train) => {
        const trainType = getShortName(train["odpt:trainType"]);

        return (
          trainType !== null &&
          trainType !== "Local" &&
          (train["odpt:trainTimetableObject"] ?? []).length > 1
        );
      }) ??
      data.find(
        (train) => (train["odpt:trainTimetableObject"] ?? []).length > 1,
      ) ??
      data[0];

    printSampleTrain(interestingTrain, 0);

    console.log("========================================");

    console.log("Field Availability");

    console.log("========================================");

    console.log("");

    printFieldAvailability(data);

    console.log("");
  }

  console.log("========================================");

  console.log("Final Result");

  console.log("========================================");

  console.log("");

  console.log(`Total TrainTimetable records: ${totalRecords}`);

  if (totalRecords > 0) {
    console.log("");
    console.log("TrainTimetable data is available for Keikyu.");

    console.log("Check the sample stops and field availability above.");
  } else {
    console.log("");
    console.log("No Keikyu TrainTimetable records were discovered.");
  }

  console.log("");

  console.log("========================================");

  console.log("Audit Complete");

  console.log("========================================");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
