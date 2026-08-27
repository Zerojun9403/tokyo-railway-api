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

  /*
   * 시간표 데이터에서 사용
   */
  departureTime?: string;

  minutesUntilDeparture?: number;

  /*
   * 실시간 열차 위치 데이터에서 사용
   */
  fromStation?: string;

  toStation?: string;

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