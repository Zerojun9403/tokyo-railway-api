export type RailwayOperator =
  | "tokyo-metro"
  | "toei"
  | "jr-east"
  | "keisei"
  | "keikyu"
  | "seibu"
  | "tokyu";

export type TrainStatus = "normal" | "delayed" | "cancelled" | "unknown";

export type RailwayTrain = {
  id: string;
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
  departureTime?: string;
  minutesUntilDeparture?: number;
  fromStation?: string;
  toStation?: string;
  trainType?: string;
  trainTypeKo?: string;
  trainTypeJa?: string;
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

export type RailwayTimetable = {
  id: string;
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
  departureTime: string;
  trainType?: string;
  trainTypeKo?: string;
  trainTypeJa?: string;
  destinationStation?: string;
  destinationKo?: string;
  destinationJa?: string;
};

export type TimetableResponse = {
  operator: RailwayOperator;
  lineId: string;
  stationId: string;
  directionId: string;
  updatedAt: string;
  timetable: RailwayTimetable[];
};