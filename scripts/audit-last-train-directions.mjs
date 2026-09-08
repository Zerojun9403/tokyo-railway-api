const API_BASE_URL = "https://tokyo-railway-api.vercel.app";

const TARGETS = [
  {
    operator: "jr-east",
    guideLineId: "chuo-rapid",
    railway: "odpt.Railway:JR-East.ChuoRapid",
  },
  {
    operator: "jr-east",
    guideLineId: "chuo-sobu-local",
    railway: "odpt.Railway:JR-East.ChuoSobuLocal",
  },
  {
    operator: "jr-east",
    guideLineId: "keihin-tohoku",
    railway: "odpt.Railway:JR-East.KeihinTohokuNegishi",
  },
  {
    operator: "jr-east",
    guideLineId: "saikyo",
    railway: "odpt.Railway:JR-East.SaikyoKawagoe",
  },
  {
    operator: "jr-east",
    guideLineId: "shonan-shinjuku",
    railway: "odpt.Railway:JR-East.ShonanShinjuku",
  },
  {
    operator: "jr-east",
    guideLineId: "tokaido",
    railway: "odpt.Railway:JR-East.Tokaido",
  },
  {
    operator: "jr-east",
    guideLineId: "keiyo",
    railway: "odpt.Railway:JR-East.Keiyo",
  },

  {
    operator: "jr-east",
    guideLineId: "yokosuka-sobu",
    variant: "yokosuka",
    railway: "odpt.Railway:JR-East.Yokosuka",
  },
  {
    operator: "jr-east",
    guideLineId: "yokosuka-sobu",
    variant: "sobu-rapid",
    railway: "odpt.Railway:JR-East.SobuRapid",
  },

  {
    operator: "jr-east",
    guideLineId: "narita",
    variant: "narita",
    railway: "odpt.Railway:JR-East.Narita",
  },
  {
    operator: "jr-east",
    guideLineId: "narita",
    variant: "narita-airport",
    railway: "odpt.Railway:JR-East.NaritaAirportBranch",
  },

  {
    operator: "keikyu",
    guideLineId: "keikyu-main",
    railway: "odpt.Railway:Keikyu.Main",
  },
  {
    operator: "keikyu",
    guideLineId: "keikyu-airport",
    railway: "odpt.Railway:Keikyu.Airport",
  },

  {
    operator: "seibu",
    guideLineId: "seibu-ikebukuro",
    railway: "odpt.Railway:Seibu.Ikebukuro",
  },
  {
    operator: "seibu",
    guideLineId: "seibu-shinjuku",
    railway: "odpt.Railway:Seibu.Shinjuku",
  },

  {
    operator: "tokyu",
    guideLineId: "tokyu-toyoko",
    railway: "odpt.Railway:Tokyu.Toyoko",
  },
  {
    operator: "tokyu",
    guideLineId: "tokyu-meguro",
    railway: "odpt.Railway:Tokyu.Meguro",
  },
  {
    operator: "tokyu",
    guideLineId: "tokyu-den-en-toshi",
    railway: "odpt.Railway:Tokyu.DenEnToshi",
  },
  {
    operator: "tokyu",
    guideLineId: "tokyu-oimachi",
    railway: "odpt.Railway:Tokyu.Oimachi",
  },
  {
    operator: "tokyu",
    guideLineId: "tokyu-shin-yokohama",
    railway: "odpt.Railway:Tokyu.TokyuShinYokohama",
  },
];

const auditTarget = async (target) => {
  const url = new URL(`${API_BASE_URL}/api/debug/station-timetable-audit`);

  url.searchParams.set("operator", target.operator);
  url.searchParams.set("railway", target.railway);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${response.status} ${response.statusText}\n${text}`);
  }

  if (!response.ok || !data.ok) {
    throw new Error(
      `${response.status} ${response.statusText}\n${JSON.stringify(
        data,
        null,
        2,
      )}`,
    );
  }

  return {
    operator: target.operator,
    guideLineId: target.guideLineId,
    variant: target.variant ?? null,
    railway: target.railway,

    timetableRecords: data.summary?.timetableRecords ?? 0,
    timetableEntries: data.summary?.timetableEntries ?? 0,
    stationCount: data.summary?.stationCount ?? 0,

    directions: (data.directions ?? []).map((direction) => direction.full),

    calendars: (data.calendars ?? []).map((calendar) => calendar.full),

    directionExamples: data.directionExamples ?? [],

    stationSamples: data.stationSamples ?? [],
  };
};

const main = async () => {
  console.log("");
  console.log("=========================================================");
  console.log(" Tokyo Railway Guide - Last Train Direction Audit");
  console.log(" Production API mode");
  console.log("=========================================================");
  console.log("");

  const results = [];

  for (const target of TARGETS) {
    const variantText = target.variant ? ` / (${target.variant})` : "";

    process.stdout.write(
      `🔎 ${target.operator} / ${target.guideLineId}${variantText} ... `,
    );

    try {
      const result = await auditTarget(target);

      results.push(result);

      console.log("OK");
    } catch (error) {
      results.push({
        operator: target.operator,
        guideLineId: target.guideLineId,
        variant: target.variant ?? null,
        railway: target.railway,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log("FAILED");
    }
  }

  console.log("");
  console.log("=========================================================");
  console.log(" DIRECTION SUMMARY");
  console.log("=========================================================");

  for (const result of results) {
    const variantText = result.variant ? ` / ${result.variant}` : "";

    console.log("");
    console.log(
      `${result.error ? "❌" : "✅"} ${result.operator} / ${result.guideLineId}${variantText}`,
    );

    if (result.error) {
      console.log(`   ERROR: ${result.error}`);
      continue;
    }

    console.log(`   Railway: ${result.railway}`);
    console.log(`   Records: ${result.timetableRecords}`);
    console.log(`   Entries: ${result.timetableEntries}`);
    console.log(`   Stations: ${result.stationCount}`);

    console.log(
      `   Directions: ${
        result.directions.length > 0 ? result.directions.join(", ") : "(none)"
      }`,
    );

    console.log(
      `   Calendars: ${
        result.calendars.length > 0 ? result.calendars.join(", ") : "(none)"
      }`,
    );

    if (result.directionExamples.length > 0) {
      console.log("   Examples:");

      for (const example of result.directionExamples) {
        console.log(`     - ${example.direction}`);

        console.log(`       Station: ${example.station ?? "-"}`);

        console.log(`       First: ${example.firstDeparture ?? "-"}`);

        console.log(`       Destination: ${example.destination ?? "-"}`);
      }
    }
  }

  console.log("");
  console.log("=========================================================");
  console.log(" JSON FOR CHATGPT");
  console.log("=========================================================");

  console.log(JSON.stringify(results, null, 2));
};

main().catch((error) => {
  console.error("");
  console.error("AUDIT FAILED");
  console.error(error);

  process.exitCode = 1;
});
