import type { RailwayProvider } from "./types";

export const tokyoMetroProvider: RailwayProvider = {
  operator: "tokyo-metro",

  getTrains: async ({
    lineId,
    stationId,
    directionId,
  }) => {
    console.log(
      "[Tokyo Metro Provider]",
      {
        lineId,
        stationId,
        directionId,
      },
    );

    /*
     * 실제 Tokyo Metro / ODPT 연결은
     * API Key를 사용할 수 있는 환경에서 구현한다.
     */

    return [];
  },
};