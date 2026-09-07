export type OdptDestinationName = {
  ko: string;
  ja?: string;
};

/**
 * ODPT StationTimetable의 destinationStation 마지막 segment를
 * GUIDE 표시용 한국어 행선지로 변환한다.
 *
 * 현재 audit 완료 범위:
 * - Toei
 * - Tokyu
 * - Seibu
 * - Keikyu
 *
 * 직통운전 때문에 타사 역도 포함한다.
 */
export const odptDestinationNames: Record<string, OdptDestinationName> = {
  Asakusa: { ko: "아사쿠사" },
  Ogikubo: { ko: "오기쿠보" },
  NakaMeguro: { ko: "나카메구로" },
  KitaSenju: { ko: "기타센주" },
  Nakano: { ko: "나카노" },
  NishiFunabashi: { ko: "니시후나바시" },
  YoyogiUehara: { ko: "요요기우에하라" },
  KitaAyase: { ko: "기타아야세" },
  Ayase: { ko: "아야세" },
  Myogadani: { ko: "묘가다니" },
  NakanoSakaue: { ko: "나카노사카우에" },
  Honancho: { ko: "호난초" },
  Ueno: { ko: "우에노" },
  TameikeSanno: { ko: "다메이케산노" },
  Toyocho: { ko: "도요초" },
  Myoden: { ko: "묘덴" },
  Urayasu: { ko: "우라야스" },
  Kasai: { ko: "가사이" },
  // Hokuso
  ImbaNihonIdai: { ko: "인바니혼이다이" },
  InzaiMakinohara: { ko: "인자이마키노하라" },

  // Keikyu
  HanedaAirportTerminal1and2: { ko: "하네다공항 제1·제2터미널" },
  KeikyuKamata: { ko: "게이큐카마타" },
  KeikyuKawasaki: { ko: "게이큐카와사키" },
  Kojimashinden: { ko: "고지마신덴" },
  Horinouchi: { ko: "호리노우치" },
  KeikyuKurihama: { ko: "게이큐쿠리하마" },
  Misakiguchi: { ko: "미사키구치" },
  Miurakaigan: { ko: "미우라카이간" },
  Kamiooka: { ko: "가미오오카" },
  KanagawaShimmachi: { ko: "가나가와신마치" },
  KanazawaBunko: { ko: "가나자와분코" },
  Sengakuji: { ko: "센가쿠지" },
  Shinagawa: { ko: "시나가와" },
  Uraga: { ko: "우라가" },
  KanazawaHakkei: { ko: "가나자와핫케이" },
  ZushiHayama: { ko: "즈시·하야마" },

  // Keisei / Shibayama
  KeiseiNarita: { ko: "게이세이나리타" },
  KeiseiSakura: { ko: "게이세이사쿠라" },
  KeiseiTakasago: { ko: "게이세이타카사고" },
  NaritaAirportTerminal1: { ko: "나리타공항 제1터미널" },
  Sogosando: { ko: "소고산도" },
  Aoto: { ko: "아오토" },
  ShibayamaChiyoda: { ko: "시바야마치요다" },

  // Keio
  Sasazuka: { ko: "사사즈카" },
  Hashimoto: { ko: "하시모토" },
  KeioTamaCenter: { ko: "게이오타마센터" },
  Wakabadai: { ko: "와카바다이" },

  // Toei
  ArakawaShakomae: { ko: "아라카와샤코마에" },
  MachiyaEkimae: { ko: "마치야에키마에" },
  Minowabashi: { ko: "미노와바시" },
  OjiEkimae: { ko: "오지에키마에" },
  OtsukaEkimae: { ko: "오츠카에키마에" },
  Waseda: { ko: "와세다" },
  Asakusabashi: { ko: "아사쿠사바시" },
  NishiMagome: { ko: "니시마고메" },
  Oshiage: { ko: "오시아게" },
  NishiTakashimadaira: { ko: "니시타카시마다이라" },
  ShirokaneTakanawa: { ko: "시로카네타카나와" },
  Takashimadaira: { ko: "타카시마다이라" },
  MinumadaiShinsuikoen: { ko: "미누마다이신스이코엔" },
  Nippori: { ko: "닛포리" },
  ToneriKoen: { ko: "토네리코엔" },
  Hikarigaoka: { ko: "히카리가오카" },
  KiyosumiShirakawa: { ko: "기요스미시라카와" },
  ShinOkachimachi: { ko: "신오카치마치" },
  Shiodome: { ko: "시오도메" },
  Tochomae: { ko: "도초마에" },
  Iwamotocho: { ko: "이와모토초" },
  Mizue: { ko: "미즈에" },
  Motoyawata: { ko: "모토야와타" },
  Ojima: { ko: "오지마" },
  Shinjuku: { ko: "신주쿠" },

  // Sotetsu
  Shonandai: { ko: "쇼난다이" },
  Ebina: { ko: "에비나" },
  Yamato: { ko: "야마토" },
  Nishiya: { ko: "니시야" },

  // Minatomirai / Saitama Railway
  MotomachiChukagai: { ko: "모토마치·주카가이" },
  Hatogaya: { ko: "하토가야" },
  UrawaMisono: { ko: "우라와미소노" },

  // Seibu
  Agano: { ko: "아가노" },
  Hanno: { ko: "한노" },
  Hoya: { ko: "호야" },
  Ikebukuro: { ko: "이케부쿠로" },
  Kiyose: { ko: "기요세" },
  Kotesashi: { ko: "고테사시" },
  ShakujiiKoen: { ko: "샤쿠지이코엔" },
  Tokorozawa: { ko: "도코로자와" },
  Haijima: { ko: "하이지마" },
  Kodaira: { ko: "고다이라" },
  TamagawaJosui: { ko: "다마가와조스이" },
  HigashiMurayama: { ko: "히가시무라야마" },
  Kokubunji: { ko: "고쿠분지" },
  NishiTokorozawa: { ko: "니시토코로자와" },
  SeibukyujoMae: { ko: "세이부큐조마에" },
  SeibuChichibu: { ko: "세이부치치부" },
  Seibuen: { ko: "세이부엔" },
  KotakeMukaihara: { ko: "고타케무카이하라" },
  HonKawagoe: { ko: "혼카와고에" },
  KamiShakujii: { ko: "가미샤쿠지이" },
  SeibuShinjuku: { ko: "세이부신주쿠" },
  ShinTokorozawa: { ko: "신토코로자와" },
  Tanashi: { ko: "다나시" },
  Koremasa: { ko: "고레마사" },
  MusashiSakai: { ko: "무사시사카이" },
  Hagiyama: { ko: "하기야마" },
  Tamako: { ko: "다마코" },
  Toshimaen: { ko: "도시마엔" },

  // Chichibu
  Mitsumineguchi: { ko: "미쓰미네구치" },
  Nagatoro: { ko: "나가토로" },

  // Tokyo Metro destinations appearing through service
  ShinKiba: { ko: "신키바" },
  Toyosu: { ko: "도요스" },
  Wakoshi: { ko: "와코시" },
  ShinjukuSanchome: { ko: "신주쿠산초메" },
  AoyamaItchome: { ko: "아오야마잇초메" },
  Hanzomon: { ko: "한조몬" },
  Nagatacho: { ko: "나가타초" },
  AkabaneIwabuchi: { ko: "아카바네이와부치" },
  Komagome: { ko: "고마고메" },
  OjiKamiya: { ko: "오지카미야" },

  // Tokyu
  ChuoRinkan: { ko: "주오린칸" },
  FutakoTamagawa: { ko: "후타코타마가와" },
  Nagatsuta: { ko: "나가쓰타" },
  Saginuma: { ko: "사기누마" },
  Shibuya: { ko: "시부야" },
  Gotanda: { ko: "고탄다" },
  Kamata: { ko: "가마타" },
  Yukigayaotsuka: { ko: "유키가야오츠카" },
  Kodomonokuni: { ko: "고도모노쿠니" },
  Hiyoshi: { ko: "히요시" },
  Meguro: { ko: "메구로" },
  MusashiKosugi: { ko: "무사시코스기" },
  Okusawa: { ko: "오쿠사와" },
  Mizonokuchi: { ko: "미조노쿠치" },
  Oimachi: { ko: "오이마치" },
  Kamimachi: { ko: "가미마치" },
  SangenJaya: { ko: "산겐자야" },
  ShimoTakaido: { ko: "시모타카이도" },
  ShinYokohama: { ko: "신요코하마" },
  Tamagawa: { ko: "다마가와" },
  Jiyugaoka: { ko: "지유가오카" },
  Kikuna: { ko: "기쿠나" },
  Motosumiyoshi: { ko: "모토스미요시" },
  Yokohama: { ko: "요코하마" },

  // Tobu
  Kuki: { ko: "구키" },
  MinamiKurihashi: { ko: "미나미쿠리하시" },
  KitaKoshigaya: { ko: "기타코시가야" },
  TobuDobutsuKoen: { ko: "도부도부쓰코엔" },
  Kawagoeshi: { ko: "가와고에시" },
  Ogawamachi: { ko: "오가와마치" },
  Shiki: { ko: "시키" },
  ShinrinKoen: { ko: "신린코엔" },
};

export const getOdptDestinationNameKo = (
  destinationStation?: string,
): string | undefined => {
  if (!destinationStation) {
    return undefined;
  }

  const segments = destinationStation.split(".");
  const stationId = segments[segments.length - 1];

  return odptDestinationNames[stationId]?.ko ?? stationId;
};
