import type { RailwayProvider } from "./types";

export const toeiProvider: RailwayProvider = {
  operator: "toei",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log(
      "[Toei Provider]",
      {
        lineId,
        stationId,
        directionId,
      },
    );

    /*
     * 실제 Toei / ODPT 연결은
     * API Key를 사용할 수 있는 환경에서 구현한다.
     */

    return [];
  },
};