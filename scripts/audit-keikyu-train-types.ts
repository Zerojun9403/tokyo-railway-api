import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:trainType"?: string;
};

type StationTimetableRaw = {
  "odpt:stationTimetableObject"?: StationTimetableObjectRaw[];
};

const KEIKYU_RAILWAYS = [
  "odpt.Railway:Keikyu.Main",
  "odpt.Railway:Keikyu.Airport",
  "odpt.Railway:Keikyu.Kurihama",
  "odpt.Railway:Keikyu.Zushi",
  "odpt.Railway:Keikyu.Daishi",
];

const getShortName = (
  value?: string | null,
): string | null => {
  if (!value) {
    return null;
  }

  const colonPart =
    value.split(":").at(-1) ?? value;

  return (
    colonPart.split(".").at(-1) ?? colonPart
  );
};

const getApiKey = (): string => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ODPT_API_KEY is not configured",
    );
  }

  return apiKey;
};

const auditRailway = async (
  railway: string,
): Promise<Map<string, number>> => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
  );

  url.searchParams.set(
    "odpt:operator",
    "odpt.Operator:Keikyu",
  );

  url.searchParams.set(
    "odpt:railway",
    railway,
  );

  url.searchParams.set(
    "acl:consumerKey",
    apiKey,
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Keikyu timetable API request failed: ${response.status}`,
    );
  }

  const data =
    (await response.json()) as StationTimetableRaw[];

  const trainTypes = new Map<string, number>();

  for (const timetable of data) {
    for (
      const item of
      timetable[
        "odpt:stationTimetableObject"
      ] ?? []
    ) {
      const trainType =
        getShortName(item["odpt:trainType"]);

      if (!trainType) {
        continue;
      }

      trainTypes.set(
        trainType,
        (trainTypes.get(trainType) ?? 0) + 1,
      );
    }
  }

  return trainTypes;
};

const main = async () => {
  const allTrainTypes =
    new Map<string, number>();

  console.log("");
  console.log(
    "========================================",
  );
  console.log(
    "Keikyu Train Type Discovery Audit",
  );
  console.log(
    "========================================",
  );
  console.log("");

  for (const railway of KEIKYU_RAILWAYS) {
    const trainTypes =
      await auditRailway(railway);

    console.log(`[OK] ${railway}`);

    if (trainTypes.size === 0) {
      console.log("  No train types found.");
    }

    const sortedRailwayTypes = [
      ...trainTypes.entries(),
    ].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (
      const [
        trainType,
        count,
      ] of sortedRailwayTypes
    ) {
      console.log(
        `  - ${trainType}: ${count}`,
      );

      allTrainTypes.set(
        trainType,
        (allTrainTypes.get(trainType) ?? 0) +
          count,
      );
    }

    console.log("");
  }

  const sortedTrainTypes = [
    ...allTrainTypes.entries(),
  ].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  console.log(
    "========================================",
  );
  console.log("All discovered train types");
  console.log(
    "========================================",
  );

  console.log(
    `Train types: ${sortedTrainTypes.length}`,
  );

  console.log("");

  for (
    const [
      trainType,
      count,
    ] of sortedTrainTypes
  ) {
    console.log(
      `- ${trainType}: ${count} timetable entries`,
    );
  }

  console.log("");

  console.log(
    "========================================",
  );
  console.log("TypeScript values");
  console.log(
    "========================================",
  );

  console.log("");

  for (const [trainType] of sortedTrainTypes) {
    console.log(`"${trainType}",`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});