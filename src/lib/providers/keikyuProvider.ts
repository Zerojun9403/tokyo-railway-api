import type { RailwayProvider } from "./types";

export const keikyuProvider: RailwayProvider = {
  operator: "keikyu",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log("[Keikyu Provider]", {
      lineId,
      stationId,
      directionId,
    });

    return [];
  },
};