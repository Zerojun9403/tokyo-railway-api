import type {
  RailwayOperator,
  RailwayTrain,
} from "@/types/railway";

export type GetTrainsParams = {
  operator: RailwayOperator;

  lineId: string;

  stationId: string;

  directionId: string;
};

export interface RailwayProvider {
  operator: RailwayOperator;

  getTrains: (
    params: GetTrainsParams,
  ) => Promise<RailwayTrain[]>;
}