import { loadEnvConfig } from "@next/env";
import { seibuStationNames } from "../src/lib/providers/seibuStationNames";

loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:destinationStation"?: string[];
};

type StationTimetableRaw = {
  "odpt:stationTimetableObject"?: StationTimetableObjectRaw[];
};

const SEIBU_RAILWAYS = [
  "odpt.Railway:Seibu.Sayama",
  "odpt.Railway:Seibu.Haijima",
  "odpt.Railway:Seibu.Ikebukuro",
  "odpt.Railway:Seibu.Kokubunji",
  "odpt.Railway:Seibu.SeibuChichibu",
  "odpt.Railway:Seibu.SeibuYurakucho",
  "odpt.Railway:Seibu.Seibuen",
  "odpt.Railway:Seibu.Shinjuku",
  "odpt.Railway:Seibu.Tamagawa",
  "odpt.Railway:Seibu.Tamako",
  "odpt.Railway:Seibu.Toshima",
  "odpt.Railway:Seibu.Yamaguchi",
];

const getLastSegment = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const segments = value.split(".");

  return segments[segments.length - 1];
};

const getApiKey = (): string => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error("ODPT_API_KEY is not configured");
  }

  return apiKey;
};

const auditRailway = async (
  railway: string,
): Promise<Set<string>> => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
  );

  url.searchParams.set("odpt:operator", "odpt.Operator:Seibu");
  url.searchParams.set("odpt:railway", railway);
  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Seibu timetable API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as StationTimetableRaw[];

  const destinations = new Set<string>();

  for (const timetable of data) {
    for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
      for (const destination of item["odpt:destinationStation"] ?? []) {
        const stationName = getLastSegment(destination);

        if (stationName) {
          destinations.add(stationName);
        }
      }
    }
  }

  return destinations;
};

const main = async () => {
  const allDestinations = new Set<string>();

  for (const railway of SEIBU_RAILWAYS) {
    const destinations = await auditRailway(railway);

    for (const destination of destinations) {
      allDestinations.add(destination);
    }

    console.log(
      `[OK] ${railway} - ${destinations.size} destinations`,
    );
  }

  const sortedDestinations = [...allDestinations].sort((a, b) =>
    a.localeCompare(b),
  );

  const translated = sortedDestinations.filter(
    (destination) => seibuStationNames[destination],
  );

  const missing = sortedDestinations.filter(
    (destination) => !seibuStationNames[destination],
  );

  console.log("");
  console.log("========================================");
  console.log("Seibu Destination Audit");
  console.log("========================================");
  console.log(`Destinations: ${sortedDestinations.length}`);
  console.log(`Translated:   ${translated.length}`);
  console.log(`Missing:      ${missing.length}`);
  console.log("");

  if (missing.length > 0) {
    console.log("Missing destinations:");

    for (const destination of missing) {
      console.log(`- ${destination}`);
    }
  } else {
    console.log("All destinations are translated.");
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});