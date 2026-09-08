import fs from "node:fs";
import path from "node:path";

const API_BASE_URL = "https://api-challenge.odpt.org/api/v4";

const API_KEY = process.env.ODPT_API_KEY;

if (!API_KEY) {
  console.error("❌ ODPT_API_KEY가 없습니다.");
  console.error(
    "node --env-file=.env.local scripts/collect-station-coordinates.mjs",
  );
  process.exit(1);
}

const operators = [
  {
    guideId: "jr-east",
    odptId: "odpt.Operator:JR-East",
  },
  {
    guideId: "keikyu",
    odptId: "odpt.Operator:Keikyu",
  },
  {
    guideId: "keisei",
    odptId: "odpt.Operator:Keisei",
  },
  {
    guideId: "seibu",
    odptId: "odpt.Operator:Seibu",
  },
  {
    guideId: "tokyo-metro",
    odptId: "odpt.Operator:TokyoMetro",
  },
  {
    guideId: "tokyu",
    odptId: "odpt.Operator:Tokyu",
  },
];

const fetchStations = async (operator) => {
  const url = new URL(`${API_BASE_URL}/odpt:Station`);

  url.searchParams.set("odpt:operator", operator.odptId);
  url.searchParams.set("acl:consumerKey", API_KEY);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${operator.odptId} 요청 실패: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`${operator.odptId} 응답이 배열이 아닙니다.`);
  }

  return data;
};

const normalizeStation = (station, operator) => {
  const latitude = station["geo:lat"];
  const longitude = station["geo:long"];

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return {
    operatorId: operator.guideId,
    odptOperatorId: operator.odptId,

    odptStationId: station["owl:sameAs"] ?? null,
    railwayId: station["odpt:railway"] ?? null,

    stationCode: station["odpt:stationCode"] ?? null,

    nameJa: station["odpt:stationTitle"]?.ja ?? station["dc:title"] ?? null,

    nameEn: station["odpt:stationTitle"]?.en ?? null,

    latitude,
    longitude,
  };
};

const main = async () => {
  const allStations = [];

  console.log("");
  console.log("🚉 ODPT 역 좌표 수집 시작");
  console.log("");

  for (const operator of operators) {
    try {
      console.log(`▶ ${operator.guideId}`);

      const stations = await fetchStations(operator);

      const coordinates = stations
        .map((station) => normalizeStation(station, operator))
        .filter(Boolean);

      const missingCount = stations.length - coordinates.length;

      console.log(`   전체 역 객체 : ${stations.length}`);
      console.log(`   좌표 있음    : ${coordinates.length}`);
      console.log(`   좌표 없음    : ${missingCount}`);
      console.log("");

      allStations.push(...coordinates);
    } catch (error) {
      console.error(`❌ ${operator.guideId} 수집 실패`);
      console.error(error);
      console.log("");
    }
  }

  const outputDirectory = path.resolve("output");
  const outputFile = path.join(outputDirectory, "station-coordinates.json");

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  fs.writeFileSync(outputFile, JSON.stringify(allStations, null, 2), "utf8");

  console.log("--------------------------------");
  console.log(`총 좌표 데이터 : ${allStations.length}`);
  console.log("--------------------------------");
  console.log("");
  console.log("✅ 좌표 파일 생성 완료");
  console.log(outputFile);
  console.log("");
};

main().catch((error) => {
  console.error("❌ 좌표 수집 중 오류 발생");
  console.error(error);
  process.exit(1);
});
