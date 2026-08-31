export type TokyuStationName = {
  ko: string;
  ja: string;
};

export const tokyuStationNames: Record<string, TokyuStationName> = {
  // Tokyu Toyoko Line / Minatomirai Line
  Shibuya: {
    ko: "시부야",
    ja: "渋谷",
  },
  Kikuna: {
    ko: "기쿠나",
    ja: "菊名",
  },
  Yokohama: {
    ko: "요코하마",
    ja: "横浜",
  },
  MotomachiChukagai: {
    ko: "모토마치·주카가이",
    ja: "元町・中華街",
  },

  // Tokyu Meguro Line
  Meguro: {
    ko: "메구로",
    ja: "目黒",
  },
  MusashiKosugi: {
    ko: "무사시코스기",
    ja: "武蔵小杉",
  },
  Hiyoshi: {
    ko: "히요시",
    ja: "日吉",
  },

  // Tokyu Shin-Yokohama Line
  ShinYokohama: {
    ko: "신요코하마",
    ja: "新横浜",
  },

  // Tokyu Den-en-toshi Line
  Saginuma: {
    ko: "사기누마",
    ja: "鷺沼",
  },
  Nagatsuta: {
    ko: "나가쓰타",
    ja: "長津田",
  },
  ChuoRinkan: {
    ko: "주오린칸",
    ja: "中央林間",
  },

  // Tokyu Oimachi Line
  Oimachi: {
    ko: "오이마치",
    ja: "大井町",
  },
  Jiyugaoka: {
    ko: "지유가오카",
    ja: "自由が丘",
  },
  FutakoTamagawa: {
    ko: "후타코타마가와",
    ja: "二子玉川",
  },
  Mizonokuchi: {
    ko: "미조노쿠치",
    ja: "溝の口",
  },

  // Tokyu Ikegami Line
  Gotanda: {
    ko: "고탄다",
    ja: "五反田",
  },
  Kamata: {
    ko: "가마타",
    ja: "蒲田",
  },

  // Tokyu Tamagawa Line
  Tamagawa: {
    ko: "다마가와",
    ja: "多摩川",
  },

  // Tokyu Kodomonokuni Line
  Kodomonokuni: {
    ko: "고도모노쿠니",
    ja: "こどもの国",
  },

  // Through service destinations
  Shonandai: {
    ko: "쇼난다이",
    ja: "湘南台",
  },
};