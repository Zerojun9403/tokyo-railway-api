import type { RailwayProvider } from "./types";

export const keiseiProvider: RailwayProvider = {
  operator: "keisei",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Keisei Provider]", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },
};