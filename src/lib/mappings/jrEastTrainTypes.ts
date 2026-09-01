export type JrEastTrainType = {
  ko: string;
  ja: string;
};

export const jrEastTrainTypes: Record<
  string,
  JrEastTrainType
> = {
  Rapid: {
    ko: "쾌속",
    ja: "快速",
  },

  ChuoSpecialRapid: {
    ko: "중앙특쾌",
    ja: "中央特快",
  },

  OmeSpecialRapid: {
    ko: "오메특쾌",
    ja: "青梅特快",
  },
  
  Tachikawa: {
  ko: "다치카와",
  ja: "立川",
},
};