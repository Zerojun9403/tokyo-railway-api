import { KEIKYU_DESTINATION_MAP } from "../src/lib/providers/keikyuProvider";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:destinationStation"?: string[];
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

const getShortName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const colonPart = value.split(":").at(-1) ?? value;

  return colonPart.split(".").at(-1) ?? colonPart;
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

  url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");
  url.searchParams.set("odpt:railway", railway);
  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Keikyu timetable API request failed: ${response.status}`,
    );
  }

  const data = (await response.json()) as StationTimetableRaw[];

  const destinations = new Set<string>();

  for (const timetable of data) {
    for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
      for (const destination of item["odpt:destinationStation"] ?? []) {
        const shortName = getShortName(destination);

        if (shortName) {
          destinations.add(shortName);
        }
      }
    }
  }

  return destinations;
};

const main = async () => {
  const allDestinations = new Set<string>();

  for (const railway of KEIKYU_RAILWAYS) {
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
    (destination) => KEIKYU_DESTINATION_MAP[destination],
  );

  const missing = sortedDestinations.filter(
    (destination) => !KEIKYU_DESTINATION_MAP[destination],
  );

  console.log("");
  console.log("========================================");
  console.log("Keikyu Destination Audit");
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