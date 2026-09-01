import fs from "node:fs";
import path from "node:path";

import { jrEastStationNames } from "../src/lib/mappings/jrEastStationNames";

/*
 * =========================================================
 * JR East Destination Translation Audit
 * =========================================================
 *
 * 실제 ODPT StationTimetable API에서
 * JR East 목적지(destinationStation)를 수집한 뒤
 * jrEastStationNames 번역 테이블과 비교한다.
 *
 * API KEY는 .env.local의 ODPT_API_KEY를 사용한다.
 * =========================================================
 */

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

/*
 * 현재 Tokyo Railway Guide에서 사용하는 JR East 노선
 */
const JR_EAST_RAILWAYS = [
  "odpt.Railway:JR-East.Yamanote",
  "odpt.Railway:JR-East.ChuoRapid",
  "odpt.Railway:JR-East.ChuoSobuLocal",
  "odpt.Railway:JR-East.KeihinTohokuNegishi",
  "odpt.Railway:JR-East.SaikyoKawagoe",
  "odpt.Railway:JR-East.ShonanShinjuku",
  "odpt.Railway:JR-East.Tokaido",
  "odpt.Railway:JR-East.Keiyo",
  "odpt.Railway:JR-East.Yokosuka",
  "odpt.Railway:JR-East.SobuRapid",
  "odpt.Railway:JR-East.Sobu",
  "odpt.Railway:JR-East.Narita",
  "odpt.Railway:JR-East.NaritaAirportBranch",
] as const;

type OdptStationTimetableObject = {
  "odpt:destinationStation"?: string[];
};

type OdptStationTimetable = {
  "odpt:stationTimetableObject"?: OdptStationTimetableObject[];
};

/*
 * =========================================================
 * .env.local
 * =========================================================
 */

const loadApiKey = (): string => {
  const envPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local 파일을 찾을 수 없습니다.");
  }

  const envText = fs.readFileSync(envPath, "utf8");

  const match = envText.match(/^ODPT_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);

  const apiKey = match?.[1]?.trim();

  if (!apiKey) {
    throw new Error(".env.local에서 ODPT_API_KEY를 찾을 수 없습니다.");
  }

  return apiKey;
};

/*
 * =========================================================
 * ODPT ID -> Short Station Name
 *
 * 예:
 * odpt.Station:JR-East.Utsunomiya.Utsunomiya
 *                         ↓
 *                    Utsunomiya
 * =========================================================
 */

const getLastSegment = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const segments = value.split(".");

  return segments[segments.length - 1];
};

/*
 * =========================================================
 * 한 노선의 목적지 수집
 * =========================================================
 */

const fetchDestinations = async (
  railway: string,
  apiKey: string,
): Promise<Set<string>> => {
  const url = new URL(`${ODPT_API_BASE_URL}/odpt:StationTimetable`);

  url.searchParams.set("odpt:operator", "odpt.Operator:JR-East");

  url.searchParams.set("odpt:railway", railway);

  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`${railway} 요청 실패 (${response.status}) ${body}`);
  }

  const data = (await response.json()) as OdptStationTimetable[];

  const destinations = new Set<string>();

  for (const timetable of data) {
    const objects = timetable["odpt:stationTimetableObject"] ?? [];

    for (const item of objects) {
      const destinationStations = item["odpt:destinationStation"] ?? [];

      for (const destination of destinationStations) {
        const stationName = getLastSegment(destination);

        if (stationName) {
          destinations.add(stationName);
        }
      }
    }
  }

  return destinations;
};

/*
 * =========================================================
 * Main
 * =========================================================
 */

const main = async () => {
  console.log("");
  console.log("========================================");
  console.log(" JR East Live Destination Audit");
  console.log("========================================");
  console.log("");

  const apiKey = loadApiKey();

  const allDestinations = new Set<string>();

  for (const railway of JR_EAST_RAILWAYS) {
    const railwayName = getLastSegment(railway) ?? railway;

    process.stdout.write(`[FETCH] ${railwayName} ... `);

    try {
      const destinations = await fetchDestinations(railway, apiKey);

      console.log(`${destinations.size} destinations`);

      for (const destination of destinations) {
        allDestinations.add(destination);
      }
    } catch (error) {
      console.log("FAILED");

      console.error(error instanceof Error ? error.message : error);
    }
  }

  console.log("");
  console.log("========================================");
  console.log(" Translation Check");
  console.log("========================================");
  console.log("");

  const sortedDestinations = [...allDestinations].sort();

  const missing: string[] = [];

  for (const destination of sortedDestinations) {
    const translation = jrEastStationNames[destination];

    if (!translation) {
      missing.push(destination);

      console.log(`[MISSING] ${destination}`);

      continue;
    }

    console.log(
      `[OK] ${destination} -> ` + `${translation.ko} / ${translation.ja}`,
    );
  }

  console.log("");
  console.log("========================================");
  console.log(" Summary");
  console.log("========================================");

  console.log(`Live destinations : ${sortedDestinations.length}`);

  console.log(
    `Translated        : ${sortedDestinations.length - missing.length}`,
  );

  console.log(`Missing           : ${missing.length}`);

  if (missing.length > 0) {
    console.log("");
    console.log("Missing destinations:");
    console.log("");

    for (const destination of missing) {
      console.log(`- ${destination}`);
    }
  }

  console.log("");
};

main().catch((error) => {
  console.error("");
  console.error(
    "[AUDIT FAILED]",
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});
