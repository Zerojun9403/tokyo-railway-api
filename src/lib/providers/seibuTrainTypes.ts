export type SeibuTrainTypeName = {
  ko: string;
  ja: string;
};

export const seibuTrainTypes: Record<string, SeibuTrainTypeName> = {
  Local: {
    ko: "각역정차",
    ja: "各駅停車",
  },

  SemiExpress: {
    ko: "준급",
    ja: "準急",
  },

  Express: {
    ko: "급행",
    ja: "急行",
  },

  CommuterExpress: {
    ko: "통근급행",
    ja: "通勤急行",
  },

  Rapid: {
    ko: "쾌속",
    ja: "快速",
  },

  RapidExpress: {
    ko: "쾌속급행",
    ja: "快速急行",
  },

  CommuterSemiExpress: {
    ko: "통근준급",
    ja: "通勤準急",
  },

  LimitedExpress: {
    ko: "특급",
    ja: "特急",
  },
};