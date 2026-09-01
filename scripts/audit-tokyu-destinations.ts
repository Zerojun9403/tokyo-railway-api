import fs from "fs";
import path from "path";

import { tokyuStationNames } from "../src/lib/providers/tokyuStationNames";

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const railways = [
  "Toyoko",
  "Meguro",
  "DenEnToshi",
  "Oimachi",
  "Ikegami",
  "TokyuTamagawa",
  "Setagaya",
  "Kodomonokuni",
  "TokyuShinYokohama",
] as const;

type OdptStationTimetableItem = {
  "odpt:destinationStation"?: string[];
};

type OdptStationTimetable = {
  "odpt:stationTimetableObject"?: OdptStationTimetableItem[];
};

const getApiKey = (): string => {
  const envPath = path.resolve(process.cwd(), ".env.local");

  const env = fs.readFileSync(envPath, "utf8");

  const line = env
    .split(/\r?\n/)
    .find((value) => value.startsWith("ODPT_API_KEY="));

  if (!line) {
    throw new Error("ODPT_API_KEY를 .env.local에서 찾을 수 없습니다.");
  }

  return line
    .replace("ODPT_API_KEY=", "")
    .trim()
    .replace(/^["']|["']$/g, "");
};

const getLastSegment = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.split(".").at(-1);
};

const main = async () => {
  const apiKey = getApiKey();

  const destinations = new Set<string>();

  for (const railway of railways) {
    const params = new URLSearchParams({
      "odpt:operator": "odpt.Operator:Tokyu",
      "odpt:railway": `odpt.Railway:Tokyu.${railway}`,
      "acl:consumerKey": apiKey,
    });

    const url = `${ODPT_API_BASE_URL}/odpt:StationTimetable?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[ERROR] ${railway}: HTTP ${response.status}`);

      continue;
    }

    const data = (await response.json()) as OdptStationTimetable[];

    for (const timetable of data) {
      const timetableItems = timetable["odpt:stationTimetableObject"] ?? [];

      for (const item of timetableItems) {
        const destinationStations = item["odpt:destinationStation"] ?? [];

        for (const destination of destinationStations) {
          const stationId = getLastSegment(destination);

          if (stationId) {
            destinations.add(stationId);
          }
        }
      }
    }

    console.log(`[OK] ${railway}: ${data.length} timetable objects`);
  }

  const allDestinations = [...destinations].sort();

  const missing = allDestinations.filter(
    (destination) => !tokyuStationNames[destination],
  );

  const translated = allDestinations.length - missing.length;

  console.log("");
  console.log("=== Tokyu Destination Audit ===");
  console.log(`Destinations: ${allDestinations.length}`);
  console.log(`Translated: ${translated}`);
  console.log(`Missing: ${missing.length}`);

  if (missing.length > 0) {
    console.log("");
    console.log("=== Missing destinations ===");

    for (const destination of missing) {
      console.log(destination);
    }

    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("All Tokyu destinations have translations.");
};

main().catch((error) => {
  console.error("Tokyu destination audit failed.");
  console.error(error);
  process.exitCode = 1;
});
