import type {
  RailwayOperator,
  RailwayTrain,
  RailwayTimetable,
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

export interface RailwayProvider {
  operator: RailwayOperator;

  getTrains: (params: GetTrainsParams) => Promise<RailwayTrain[]>;

  getTimetable?: (params: GetTimetableParams) => Promise<RailwayTimetable[]>;
}
