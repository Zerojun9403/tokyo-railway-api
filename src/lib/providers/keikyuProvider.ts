import type { RailwayProvider } from "./types";
import type { RailwayTrain } from "../../types/railway";

type KeikyuTrainRaw = {
  "@id": string;
  "@type": "odpt:Train";

  "dc:date": string;
  "dct:valid": string;

  "odpt:railway": string;
  "odpt:operator": string;

  "odpt:fromStation": string | null;
  "odpt:toStation": string | null;

  "odpt:trainType": string;
  "odpt:trainNumber": string;

  "odpt:railDirection": string;
};

/*
 * =========================================================
 * ODPT ID → Short Name
 * =========================================================
 *
 * Example:
 *
 * odpt.Station:Keikyu.Main.Shinagawa
 * → Shinagawa
 *
 * odpt.RailDirection:Keikyu.Uraga
 * → Uraga
 *
 * odpt.TrainType:Keikyu.LimitedExpress
 * → LimitedExpress
 */

const getShortName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const colonPart = value.split(":").at(-1) ?? value;

  return colonPart.split(".").at(-1) ?? colonPart;
};

/*
 * =========================================================
 * Keikyu lineId → ODPT Railway ID
 * =========================================================
 */

const KEIKYU_RAILWAY_MAP: Record<string, string> = {
  main: "odpt.Railway:Keikyu.Main",
  airport: "odpt.Railway:Keikyu.Airport",
  kurihama: "odpt.Railway:Keikyu.Kurihama",
  zushi: "odpt.Railway:Keikyu.Zushi",
  daishi: "odpt.Railway:Keikyu.Daishi",
};

/*
 * =========================================================
 * Keikyu Provider
 * =========================================================
 */

export const keikyuProvider: RailwayProvider = {
  operator: "keikyu",

  getTrains: async ({ lineId, stationId, directionId }) => {
    /*
     * -----------------------------------------------------
     * API Key
     * -----------------------------------------------------
     */

    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      throw new Error("ODPT_API_KEY is not configured");
    }

    /*
     * -----------------------------------------------------
     * Railway
     * -----------------------------------------------------
     */

    const railway = KEIKYU_RAILWAY_MAP[lineId];

    if (!railway) {
      throw new Error(`Unsupported Keikyu line: ${lineId}`);
    }

    /*
     * -----------------------------------------------------
     * ODPT Request URL
     * -----------------------------------------------------
     */
    const url = new URL("https://api-challenge.odpt.org/api/v4/odpt:Train");

    url.searchParams.set("odpt:operator", "odpt.Operator:Keikyu");

    url.searchParams.set("odpt:railway", railway);

    url.searchParams.set("acl:consumerKey", apiKey);

    /*
     * -----------------------------------------------------
     * Fetch
     * -----------------------------------------------------
     */

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Keikyu API request failed: ${response.status}`);
    }

    const data = (await response.json()) as KeikyuTrainRaw[];

    /*
     * -----------------------------------------------------
     * Normalize Request Parameters
     * -----------------------------------------------------
     */

    const normalizedDirection = directionId.trim().toLowerCase();

    const normalizedStation = stationId.trim().toLowerCase();

    /*
     * -----------------------------------------------------
     * Filter trains
     * -----------------------------------------------------
     *
     * Train Location의 fromStation / toStation은
     * 열차의 현재 위치 구간을 의미한다.
     *
     * 따라서 사용자가 선택한 역이
     * fromStation 또는 toStation에 포함되는 열차만 표시한다.
     */

    const filteredData = data.filter((train) => {
      const direction = getShortName(
        train["odpt:railDirection"],
      )?.toLowerCase();

      const fromStation = getShortName(
        train["odpt:fromStation"],
      )?.toLowerCase();

      const toStation = getShortName(train["odpt:toStation"])?.toLowerCase();

      const matchesDirection = direction === normalizedDirection;

      const matchesStation =
        fromStation === normalizedStation || toStation === normalizedStation;

      return matchesDirection && matchesStation;
    });

    /*
     * -----------------------------------------------------
     * ODPT → Unified RailwayTrain
     * -----------------------------------------------------
     */

    const trains: RailwayTrain[] = filteredData.map((train) => {
      const fromStation = getShortName(train["odpt:fromStation"]) ?? undefined;

      const toStation = getShortName(train["odpt:toStation"]) ?? undefined;

      const trainType = getShortName(train["odpt:trainType"]) ?? undefined;

      return {
        id: train["@id"],

        operator: "keikyu",

        lineId,

        stationId,

        directionId,

        fromStation,

        toStation,

        trainType,

        trainNumber: train["odpt:trainNumber"],

        status: "normal",
      };
    });

    /*
     * -----------------------------------------------------
     * Debug
     * -----------------------------------------------------
     */

    return trains;
  },
};
