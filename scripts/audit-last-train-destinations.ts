/**
 * Last-train destination audit
 *
 * 대상:
 * - Tokyo Metro
 * - Toei
 * - Tokyu
 * - Seibu
 * - Keikyu
 *
 * 목적:
 * ODPT StationTimetable 전체에서 odpt:destinationStation을 모아
 * 현재 GUIDE/API에서 영문으로 노출될 가능성이 있는 행선지 ID를
 * 회사별로 한 번에 확인한다.
 *
 * 실행:
 *   npx.cmd tsx scripts/audit-last-train-destinations.ts
 *
 * 필요 환경변수:
 *   ODPT_API_KEY          - Challenge API (Tokyu / Seibu / Keikyu)
 *   TOKYO_METRO_API_KEY   - ODPT Center (Tokyo Metro)
 *
 * Toei는 Public API라 키가 필요 없다.
 */

import fs from "node:fs";
import path from "node:path";

type OperatorConfig = {
  label: string;
  operator: string;
  baseUrl: string;
  keyEnv?: "ODPT_API_KEY" | "TOKYO_METRO_API_KEY";
};

type StationTimetableItem = {
  "odpt:departureTime"?: string;
  "odpt:destinationStation"?: string[];
};

type StationTimetable = {
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: StationTimetableItem[];
};

const OPERATORS: OperatorConfig[] = [
  {
    label: "Tokyo Metro",
    operator: "odpt.Operator:TokyoMetro",
    baseUrl: "https://api.odpt.org/api/v4",
    keyEnv: "TOKYO_METRO_API_KEY",
  },
  {
    label: "Toei",
    operator: "odpt.Operator:Toei",
    baseUrl: "https://api-public.odpt.org/api/v4",
  },
  {
    label: "Tokyu",
    operator: "odpt.Operator:Tokyu",
    baseUrl: "https://api-challenge.odpt.org/api/v4",
    keyEnv: "ODPT_API_KEY",
  },
  {
    label: "Seibu",
    operator: "odpt.Operator:Seibu",
    baseUrl: "https://api-challenge.odpt.org/api/v4",
    keyEnv: "ODPT_API_KEY",
  },
  {
    label: "Keikyu",
    operator: "odpt.Operator:Keikyu",
    baseUrl: "https://api-challenge.odpt.org/api/v4",
    keyEnv: "ODPT_API_KEY",
  },
];

const loadEnvLocal = () => {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");

    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

const destinationSlug = (uri: string) => {
  const parts = uri.split(".");
  return parts.at(-1) ?? uri;
};

const fetchTimetables = async (
  config: OperatorConfig,
): Promise<StationTimetable[]> => {
  const url = new URL(`${config.baseUrl}/odpt:StationTimetable`);

  url.searchParams.set("odpt:operator", config.operator);

  if (config.keyEnv) {
    const key = process.env[config.keyEnv];

    if (!key) {
      throw new Error(`${config.label}: ${config.keyEnv} 환경변수가 없습니다.`);
    }

    url.searchParams.set("acl:consumerKey", key);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Tokyo-Railway-API Last-Train Destination Audit",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `${config.label}: HTTP ${response.status} ${response.statusText}\n${body.slice(0, 500)}`,
    );
  }

  return (await response.json()) as StationTimetable[];
};

const main = async () => {
  loadEnvLocal();

  const outputDir = path.join(process.cwd(), "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const allRows: Array<{
    operator: string;
    destinationId: string;
    slug: string;
    count: number;
  }> = [];

  console.log("🚆 Last-train destination audit 시작\n");

  for (const config of OPERATORS) {
    try {
      const timetables = await fetchTimetables(config);
      const counts = new Map<string, number>();

      for (const timetable of timetables) {
        for (const item of timetable["odpt:stationTimetableObject"] ?? []) {
          for (const destination of item["odpt:destinationStation"] ?? []) {
            counts.set(destination, (counts.get(destination) ?? 0) + 1);
          }
        }
      }

      const destinations = [...counts.entries()].sort(([a], [b]) =>
        a.localeCompare(b),
      );

      console.log(`=== ${config.label} ===`);
      console.log(`StationTimetable: ${timetables.length}`);
      console.log(`고유 행선지: ${destinations.length}`);

      for (const [destinationId, count] of destinations) {
        const slug = destinationSlug(destinationId);

        console.log(
          `${slug.padEnd(30)} ${String(count).padStart(4)}  ${destinationId}`,
        );

        allRows.push({
          operator: config.label,
          destinationId,
          slug,
          count,
        });
      }

      console.log("");
    } catch (error) {
      console.error(`❌ ${config.label}`);
      console.error(error instanceof Error ? error.message : error);
      console.log("");
    }
  }

  const jsonPath = path.join(outputDir, "last-train-destinations-audit.json");

  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf8");

  const csvPath = path.join(outputDir, "last-train-destinations-audit.csv");

  const escapeCsv = (value: string | number) => {
    const text = String(value);

    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const csv = [
    ["operator", "slug", "destinationId", "count"].join(","),
    ...allRows.map((row) =>
      [row.operator, row.slug, row.destinationId, row.count]
        .map(escapeCsv)
        .join(","),
    ),
  ].join("\n");

  fs.writeFileSync(csvPath, csv, "utf8");

  console.log("✅ audit 완료");
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV : ${csvPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
