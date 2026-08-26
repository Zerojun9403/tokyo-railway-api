import type { RailwayProvider } from "./types";

export const jrEastProvider: RailwayProvider = {
  operator: "jr-east",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[JR East Provider]", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },
};