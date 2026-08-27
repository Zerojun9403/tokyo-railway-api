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

const getShortName = (
  value?: string | null,
): string | null => {
  if (!value) {
    return null;
  }

  const colonPart =
    value.split(":").at(-1) ?? value;

  return (
    colonPart.split(".").at(-1) ??
    colonPart
  );
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




export const keikyuProvider: RailwayProvider = {
  operator: "keikyu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    const railway = KEIKYU_RAILWAY_MAP[lineId];

    if (!railway) {
      throw new Error(
        `Unsupported Keikyu line: ${lineId}`,
      );
    }

    const url = new URL(
      "https://api.odpt.org/api/v4/odpt:Train",
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Keikyu",
    );

    url.searchParams.set(
      "odpt:railway",
      railway,
    );

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Keikyu API request failed: ${response.status}`,
      );
    }

    const data =
      (await response.json()) as KeikyuTrainRaw[];

      const normalizedDirection =
        directionId.trim().toLowerCase();

      const normalizedStation =
          stationId.trim().toLowerCase();


      const filteredData = data.filter((train) => {
        const direction = getShortName(
          train["odpt:railDirection"],
        )?.toLowerCase();

        const fromStation = getShortName(
          train["odpt:fromStation"],
        )?.toLowerCase();

        const toStation = getShortName(
          train["odpt:toStation"],
        )?.toLowerCase();

        const matchesDirection =
          direction === normalizedDirection;

        const matchesStation =
          fromStation === normalizedStation ||
          toStation === normalizedStation;

        return matchesDirection && matchesStation;
});


   const trains: RailwayTrain[] = filteredData.map((train) => {
    const fromStation =
      getShortName(train["odpt:fromStation"]) ?? undefined;

    const toStation =
      getShortName(train["odpt:toStation"]) ?? undefined;

    const trainType =
      getShortName(train["odpt:trainType"]) ?? undefined;

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

    console.log(
      "[Keikyu trains]",
      {
        lineId,
        stationId,
        directionId,
        trains,
      },
    );

    return trains;;
  },
};