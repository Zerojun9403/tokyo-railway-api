import type { RailwayProvider } from "./types";

export const tokyuProvider: RailwayProvider = {
  operator: "tokyu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Tokyu Provider]", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },
};