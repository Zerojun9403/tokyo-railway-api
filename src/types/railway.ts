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
  trainNumber?: string; 
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
export type TrainInformationStatus =
  | "normal"
  | "delay"
  | "suspended"
  | "partial-suspension"
  | "through-service-suspended"
  | "resuming"
  | "information"
  | "unknown";

export type RailwayTrainInformation = {
  id: string;
  operator: RailwayOperator;
  lineId: string;
  status: TrainInformationStatus;
  title: string;
  message: string;
  cause?: string;
  affectedSection?: string;
  rawStatus?: string;
  updatedAt?: string;
};

export type TrainInformationResponse = {
  operator: RailwayOperator;
  lineId: string;
  updatedAt: string;
  information: RailwayTrainInformation[];
};
