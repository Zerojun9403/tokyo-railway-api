import type { RailwayOperator } from "@/types/railway";

type NormalizeLastTrainRequestParams = {
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
};

type NormalizedLastTrainRequest = {
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
};

/*
 * =========================================================
 * GUIDE lineId -> Provider lineId
 * =========================================================
 *
 * GUIDE는 사용자 화면 기준의 노선 ID를 사용한다.
 *
 * Provider는 ODPT Railway에 대응하는 내부 lineId를 사용한다.
 *
 * 이 파일에서만 두 체계를 연결한다.
 * =========================================================
 */

const LINE_ID_MAP: Partial<Record<RailwayOperator, Record<string, string>>> = {
  "jr-east": {
    "chuo-rapid": "chuo-rapid",
    "chuo-sobu-local": "chuo-sobu",
    "keihin-tohoku": "keihin-tohoku",
    saikyo: "saikyo",
    "shonan-shinjuku": "shonan-shinjuku",
    tokaido: "tokaido",
    keiyo: "keiyo",
  },

  keikyu: {
    "keikyu-main": "main",
    "keikyu-airport": "airport",
  },

  seibu: {
    "seibu-ikebukuro": "ikebukuro",
    "seibu-shinjuku": "shinjuku",
  },

  tokyu: {
    "tokyu-toyoko": "toyoko",
    "tokyu-meguro": "meguro",
    "tokyu-den-en-toshi": "den-en-toshi",
    "tokyu-oimachi": "oimachi",
    "tokyu-shin-yokohama": "tokyu-shin-yokohama",
  },
};

/*
 * =========================================================
 * JR East - Yokosuka / Sobu Rapid
 * =========================================================
 *
 * GUIDE:
 *
 * yokosuka-sobu
 *
 * 하나의 연속 노선으로 표시한다.
 *
 * ODPT:
 *
 * JR-East.Yokosuka
 * JR-East.SobuRapid
 *
 * 두 Railway로 분리되어 있다.
 *
 * GUIDE 역번호:
 *
 * JO01 ~ JO19
 *   -> Yokosuka
 *
 * JO20 이후
 *   -> SobuRapid
 *
 * JO19 = Tokyo
 * =========================================================
 */

const normalizeYokosukaSobuLineId = (stationId: string): string => {
  const match = /^JO(\d{2})$/.exec(stationId);

  if (!match) {
    throw new Error(`Unsupported Yokosuka/Sobu stationId: ${stationId}`);
  }

  const stationNumber = Number(match[1]);

  if (stationNumber <= 19) {
    return "yokosuka";
  }

  return "sobu-rapid";
};

/*
 * =========================================================
 * JR East - Narita / Narita Airport Branch
 * =========================================================
 */

const normalizeNaritaLineId = (stationId: string): string => {
  const match = /^JO(\d{2})$/.exec(stationId);

  if (!match) {
    throw new Error(`Unsupported Narita stationId: ${stationId}`);
  }

  const stationNumber = Number(match[1]);

  if (stationNumber <= 35) {
    return "narita";
  }

  if (stationNumber <= 37) {
    return "narita-airport";
  }

  throw new Error(`Unsupported Narita stationId: ${stationId}`);
};

/*
 * =========================================================
 * Direction
 * =========================================================
 *
 * GUIDE의 통합 요코스카선·소부쾌속선은
 * Northbound / Southbound를 사용한다.
 *
 * Provider의 Yokosuka / SobuRapid은
 * Inbound / Outbound를 사용하므로 여기에서 변환한다.
 *
 * Yokosuka:
 *   Northbound -> Inbound
 *   Southbound -> Outbound
 *
 * Sobu Rapid:
 *   Northbound -> Outbound
 *   Southbound -> Inbound
 *
 * 그 외 노선은 현재 GUIDE 방향 ID를 그대로 전달한다.
 * =========================================================
 */

const normalizeDirectionId = (
  operator: RailwayOperator,
  lineId: string,
  directionId: string,
): string => {
  if (operator !== "jr-east") {
    return directionId;
  }

  if (lineId === "yokosuka") {
    if (directionId === "Northbound") {
      return "Inbound";
    }

    if (directionId === "Southbound") {
      return "Outbound";
    }
  }

  if (lineId === "sobu-rapid") {
    if (directionId === "Northbound") {
      return "Outbound";
    }

    if (directionId === "Southbound") {
      return "Inbound";
    }
  }

  return directionId;
};

/*
 * =========================================================
 * Normalize Last Train Request
 * =========================================================
 */

export const normalizeLastTrainRequest = ({
  operator,
  lineId,
  stationId,
  directionId,
}: NormalizeLastTrainRequestParams): NormalizedLastTrainRequest => {
  let normalizedLineId = lineId;

  /*
   * JR East 특수 노선
   */

  if (operator === "jr-east") {
    if (lineId === "yokosuka-sobu") {
      normalizedLineId = normalizeYokosukaSobuLineId(stationId);
    } else if (lineId === "narita") {
      normalizedLineId = normalizeNaritaLineId(stationId);
    } else {
      normalizedLineId = LINE_ID_MAP["jr-east"]?.[lineId] ?? lineId;
    }
  } else {
    /*
     * Keikyu / Seibu / Tokyu
     */

    normalizedLineId = LINE_ID_MAP[operator]?.[lineId] ?? lineId;
  }

  return {
    operator,
    lineId: normalizedLineId,
    stationId,
    directionId: normalizeDirectionId(operator, normalizedLineId, directionId),
  };
};
