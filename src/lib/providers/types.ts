import type {
  RailwayOperator,
  RailwayTrain,
  RailwayTimetable,
  RailwayTrainInformation,
} from "@/types/railway";

export type GetTrainsParams = {
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
};

export type GetTimetableParams = {
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
};

export type GetTrainInformationParams = {
  operator: RailwayOperator;
  lineId: string;
};

export interface RailwayProvider {
  operator: RailwayOperator;

  getTrains: (
    params: GetTrainsParams,
  ) => Promise<RailwayTrain[]>;

  getTimetable?: (
    params: GetTimetableParams,
  ) => Promise<RailwayTimetable[]>;

  getTrainInformation?: (
    params: GetTrainInformationParams,
  ) => Promise<RailwayTrainInformation[]>;
}