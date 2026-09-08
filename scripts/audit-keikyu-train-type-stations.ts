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
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: StationTimetableObjectRaw[];
};

type StationTrainTypeInfo = {
  station: string;
  count: number;
  destinations: Set<string>;
};

type TrainTypeSummary = {
  totalCount: number;
  stations: Map<string, StationTrainTypeInfo>;
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

const fetchRailwayTimetable = async (
  railway: string,
): Promise<StationTimetableRaw[]> => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
  );

  url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");

  url.searchParams.set("odpt:railway", railway);

  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Keikyu timetable API request failed: ${response.status}`);
  }

  return (await response.json()) as StationTimetableRaw[];
};

const buildTrainTypeSummary = (
  data: StationTimetableRaw[],
): Map<string, TrainTypeSummary> => {
  const summaries = new Map<string, TrainTypeSummary>();

  for (const timetable of data) {
    const station = getShortName(timetable["odpt:station"]);

    if (!station) {
      continue;
    }

    const objects = timetable["odpt:stationTimetableObject"] ?? [];

    for (const item of objects) {
      const trainType = getShortName(item["odpt:trainType"]);

      if (!trainType) {
        continue;
      }

      let summary = summaries.get(trainType);

      if (!summary) {
        summary = {
          totalCount: 0,
          stations: new Map(),
        };

        summaries.set(trainType, summary);
      }

      summary.totalCount += 1;

      let stationInfo = summary.stations.get(station);

      if (!stationInfo) {
        stationInfo = {
          station,
          count: 0,
          destinations: new Set(),
        };

        summary.stations.set(station, stationInfo);
      }

      stationInfo.count += 1;

      for (const destination of getShortNames(
        item["odpt:destinationStation"],
      )) {
        stationInfo.destinations.add(destination);
      }
    }
  }

  return summaries;
};

const printRailwaySummary = (
  railway: string,
  summaries: Map<string, TrainTypeSummary>,
) => {
  console.log("");
  console.log("========================================");
  console.log(getShortName(railway) ?? railway);
  console.log("========================================");
  console.log("");

  const sortedTrainTypes = [...summaries.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [trainType, summary] of sortedTrainTypes) {
    console.log(`----------------------------------------`);

    console.log(`${trainType}`);

    console.log(`Entries: ${summary.totalCount}`);

    console.log(`Stations: ${summary.stations.size}`);

    console.log("");

    const sortedStations = [...summary.stations.values()].sort((a, b) =>
      a.station.localeCompare(b.station),
    );

    for (const station of sortedStations) {
      const destinations = [...station.destinations].sort();

      console.log(`  STOP  ${station.station}`);

      console.log(`        entries: ${station.count}`);

      if (destinations.length > 0) {
        console.log(`        destinations: ${destinations.join(", ")}`);
      }
    }

    console.log("");
  }
};

const printCalendarDirectionComparison = (
  railway: string,
  data: StationTimetableRaw[],
) => {
  const combinations = new Map<string, Map<string, Set<string>>>();

  for (const timetable of data) {
    const station = getShortName(timetable["odpt:station"]);

    if (!station) {
      continue;
    }

    const calendar =
      getShortName(timetable["odpt:calendar"]) ?? "UnknownCalendar";

    const direction =
      getShortName(timetable["odpt:railDirection"]) ?? "UnknownDirection";

    const key = `${calendar} / ${direction}`;

    let trainTypes = combinations.get(key);

    if (!trainTypes) {
      trainTypes = new Map();
      combinations.set(key, trainTypes);
    }

    for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
      const trainType = getShortName(item["odpt:trainType"]);

      if (!trainType) {
        continue;
      }

      let stations = trainTypes.get(trainType);

      if (!stations) {
        stations = new Set();
        trainTypes.set(trainType, stations);
      }

      stations.add(station);
    }
  }

  console.log("");
  console.log("========================================");

  console.log(`${getShortName(railway) ?? railway}`);

  console.log("Calendar / Direction Comparison");

  console.log("========================================");

  console.log("");

  const sortedCombinations = [...combinations.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [combination, trainTypes] of sortedCombinations) {
    console.log(`[${combination}]`);

    const sortedTrainTypes = [...trainTypes.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );

    for (const [trainType, stations] of sortedTrainTypes) {
      console.log(`  ${trainType.padEnd(30)} ${stations.size} stations`);
    }

    console.log("");
  }
};

const printPatternDifferences = (
  railway: string,
  data: StationTimetableRaw[],
) => {
  const patterns = new Map<string, Map<string, Set<string>>>();

  for (const timetable of data) {
    const station = getShortName(timetable["odpt:station"]);

    if (!station) {
      continue;
    }

    const calendar =
      getShortName(timetable["odpt:calendar"]) ?? "UnknownCalendar";

    const direction =
      getShortName(timetable["odpt:railDirection"]) ?? "UnknownDirection";

    const patternKey = `${calendar} / ${direction}`;

    let trainTypes = patterns.get(patternKey);

    if (!trainTypes) {
      trainTypes = new Map();

      patterns.set(patternKey, trainTypes);
    }

    for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
      const trainType = getShortName(item["odpt:trainType"]);

      if (!trainType) {
        continue;
      }

      let stations = trainTypes.get(trainType);

      if (!stations) {
        stations = new Set();

        trainTypes.set(trainType, stations);
      }

      stations.add(station);
    }
  }

  const allTrainTypes = new Set<string>();

  for (const trainTypes of patterns.values()) {
    for (const trainType of trainTypes.keys()) {
      allTrainTypes.add(trainType);
    }
  }

  console.log("");
  console.log("========================================");

  console.log(`${getShortName(railway) ?? railway}`);

  console.log("Pattern Difference Audit");

  console.log("========================================");

  console.log("");

  for (const trainType of [...allTrainTypes].sort()) {
    const patternGroups = new Map<string, string[]>();

    for (const [patternKey, trainTypes] of patterns) {
      const stations = trainTypes.get(trainType);

      if (!stations) {
        continue;
      }

      const normalizedStations = [...stations].sort();

      const signature = normalizedStations.join("|");

      const existing = patternGroups.get(signature) ?? [];

      existing.push(patternKey);

      patternGroups.set(signature, existing);
    }

    console.log(`[${trainType}]`);

    console.log(`  Unique stop patterns: ${patternGroups.size}`);

    let patternNumber = 1;

    for (const [signature, patternKeys] of patternGroups) {
      const stations = signature.length > 0 ? signature.split("|") : [];

      console.log(`  Pattern ${patternNumber}`);

      console.log(`    Used by: ${patternKeys.join(", ")}`);

      console.log(`    Stations (${stations.length}): ${stations.join(", ")}`);

      patternNumber += 1;
    }

    console.log("");
  }
};

const main = async () => {
  console.log("");
  console.log("========================================");
  console.log("Keikyu Train Type × Station Audit");
  console.log("========================================");

  for (const railway of KEIKYU_RAILWAYS) {
    console.log("");
    console.log(`[FETCH] ${railway}`);

    const data = await fetchRailwayTimetable(railway);

    console.log(`[OK] ${data.length} timetable records`);

    const summaries = buildTrainTypeSummary(data);

    printRailwaySummary(railway, summaries);

    printCalendarDirectionComparison(railway, data);

    printPatternDifferences(railway, data);
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
