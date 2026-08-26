import type { RailwayProvider } from "./types";

export const seibuProvider: RailwayProvider = {
  operator: "seibu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Seibu Provider]", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },
};