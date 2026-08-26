export type RailwayOperator =
  | "tokyo-metro"
  | "toei"
  | "jr-east"
  | "keisei"
  | "keikyu"
  | "seibu"
  | "tokyu";

  
export type TrainStatus =
  | "normal"
  | "delayed"
  | "cancelled"
  | "unknown";

export type RailwayTrain = {
  id: string;

  operator: RailwayOperator;

  lineId: string;

  stationId: string;

  directionId: string;

  departureTime: string;

  minutesUntilDeparture: number;

  trainType?: string;

  trainNumber?: string;

  destinationKo?: string;

  destinationJa?: string;

  status: TrainStatus;
};

export type TrainResponse = {
  operator: RailwayOperator;

  lineId: string;

  stationId: string;

  directionId: string;

  updatedAt: string;

  trains: RailwayTrain[];
};