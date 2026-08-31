export type TokyuTrainTypeName = {
  ko: string;
  ja: string;
};

export const tokyuTrainTypes: Record<string, TokyuTrainTypeName> = {
  Local: {
    ko: "각역정차",
    ja: "各駅停車",
  },

  Express: {
    ko: "급행",
    ja: "急行",
  },

  LimitedExpress: {
    ko: "특급",
    ja: "特急",
  },

  "F-Liner": {
    ko: "F라이너",
    ja: "Fライナー",
  },

  SemiExpress: {
    ko: "준급",
    ja: "準急",
  },
};