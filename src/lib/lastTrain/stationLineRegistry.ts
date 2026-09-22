import type { RailwayOperator } from "@/types/railway";

export type StationLastTrainDirection = {
  directionId: string;
  directionKo: string;
  directionJa?: string;
};

export type StationLastTrainLine = {
  operator: RailwayOperator;

  lineId: string;
  lineNameKo: string;
  lineNameJa?: string;

  stationId: string;

  directions: StationLastTrainDirection[];
};

export type StationLastTrainStation = {
  /*
   * PHANTOM에서 사용하는 역 식별자.
   *
   * 실제 철도 API의 stationId가 아니다.
   * 같은 신주쿠역이라도 노선별 stationId가 다르기 때문에
   * 실제 stationId는 각 line 내부에서 관리한다.
   */
  stationKey: string;

  nameKo: string;
  nameJa?: string;
  nameEn?: string;

  lines: StationLastTrainLine[];
};

/*
 * =========================================================
 * Station Last Train Registry
 * =========================================================
 *
 * PHANTOM:
 *   "신주쿠역 막차 몇 시야?"
 *
 * station
 *   → operator
 *   → line
 *   → direction
 *   → verified last train
 *
 * 주의:
 * - stationKey는 PHANTOM용 canonical key
 * - stationId는 GUIDE/API에서 사용하는 노선별 역 ID
 * - directionId는 API Provider가 받을 수 있는 방향 ID
 * =========================================================
 */

export const STATION_LAST_TRAIN_REGISTRY: StationLastTrainStation[] = [
  {
    stationKey: "shinjuku",

    nameKo: "신주쿠",
    nameJa: "新宿",
    nameEn: "Shinjuku",

    lines: [
      /*
       * =====================================================
       * JR East - Yamanote Line
       * =====================================================
       */
      {
        operator: "jr-east",

        lineId: "yamanote",
        lineNameKo: "야마노테선",
        lineNameJa: "山手線",

        stationId: "JY17",

        directions: [
          {
            directionId: "InnerLoop",
            directionKo: "내선순환",
            directionJa: "内回り",
          },
          {
            directionId: "OuterLoop",
            directionKo: "외선순환",
            directionJa: "外回り",
          },
        ],
      },

      /*
       * =====================================================
       * JR East - Chuo Rapid Line
       * =====================================================
       */
      {
        operator: "jr-east",

        lineId: "chuo-rapid",
        lineNameKo: "주오 쾌속선",
        lineNameJa: "中央線快速",

        stationId: "JC05",

        directions: [
          {
            directionId: "Inbound",
            directionKo: "도쿄 방면",
            directionJa: "東京方面",
          },
          {
            directionId: "Outbound",
            directionKo: "다카오 방면",
            directionJa: "高尾方面",
          },
        ],
      },

      /*
       * =====================================================
       * JR East - Chuo-Sobu Local Line
       * =====================================================
       */
      {
        operator: "jr-east",

        lineId: "chuo-sobu-local",
        lineNameKo: "주오·소부 완행선",
        lineNameJa: "中央・総武線各駅停車",

        stationId: "JB10",

        directions: [
          {
            directionId: "Eastbound",
            directionKo: "치바 방면",
            directionJa: "千葉方面",
          },
          {
            directionId: "Westbound",
            directionKo: "미타카 방면",
            directionJa: "三鷹方面",
          },
        ],
      },

      /*
       * =====================================================
       * JR East - Saikyo Line
       * =====================================================
       */
      {
        operator: "jr-east",

        lineId: "saikyo",
        lineNameKo: "사이쿄선",
        lineNameJa: "埼京線",

        stationId: "JA11",

        directions: [
          {
            directionId: "Northbound",
            directionKo: "오미야·가와고에 방면",
            directionJa: "大宮・川越方面",
          },
          {
            directionId: "Southbound",
            directionKo: "오사키 방면",
            directionJa: "大崎方面",
          },
        ],
      },

      /*
       * =====================================================
       * JR East - Shonan-Shinjuku Line
       * =====================================================
       */
      {
        operator: "jr-east",

        lineId: "shonan-shinjuku",
        lineNameKo: "쇼난신주쿠라인",
        lineNameJa: "湘南新宿ライン",

        stationId: "JS20",

        directions: [
          {
            directionId: "Northbound",
            directionKo: "이케부쿠로·오미야 방면",
            directionJa: "池袋・大宮方面",
          },
          {
            directionId: "Southbound",
            directionKo: "요코하마·오후나 방면",
            directionJa: "横浜・大船方面",
          },
        ],
      },
    ],
  },
    {
    stationKey: "asakusa",

    nameKo: "아사쿠사",
    nameJa: "浅草",
    nameEn: "Asakusa",

    lines: [
      /*
       * =====================================================
       * Tokyo Metro - Ginza Line
       * =====================================================
       *
       * G19 아사쿠사는 긴자선 종점이므로
       * 실제 출발 가능한 방향은 시부야 방면만 등록한다.
       */
      {
        operator: "tokyo-metro",

        lineId: "ginza",
        lineNameKo: "긴자선",
        lineNameJa: "銀座線",

        stationId: "G19",

        directions: [
          {
            directionId: "shibuya",
            directionKo: "시부야 방면",
            directionJa: "渋谷方面",
          },
        ],
      },

      /*
       * =====================================================
       * Toei - Asakusa Line
       * =====================================================
       */
      {
        operator: "toei",

        lineId: "asakusa",
        lineNameKo: "도에이 아사쿠사선",
        lineNameJa: "都営浅草線",

        stationId: "A18",

        directions: [
          {
            directionId: "oshiage",
            directionKo: "오시아게 방면",
            directionJa: "押上方面",
          },
          {
            directionId: "nishimagome",
            directionKo: "니시마고메 방면",
            directionJa: "西馬込方面",
          },
        ],
      },
    ],
  },
];