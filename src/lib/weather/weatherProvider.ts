const OPEN_METEO_GEOCODING_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

const OPEN_METEO_FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast";

export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
  admin1?: string;
};

export type DailyWeather = {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbabilityMax: number;
  precipitationSum: number;
};

type OpenMeteoGeocodingResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country_code?: string;
  admin1?: string;
};
const getWeatherDescription = (weatherCode: number): string => {
  if (weatherCode === 0) return "맑음";
  if (weatherCode === 1) return "대체로 맑음";
  if (weatherCode === 2) return "부분적으로 흐림";
  if (weatherCode === 3) return "흐림";

  if (weatherCode === 45 || weatherCode === 48) {
    return "안개";
  }

  if ([51, 53, 55, 56, 57].includes(weatherCode)) {
    return "이슬비";
  }

  if ([61, 63, 65, 66, 67].includes(weatherCode)) {
    return "비";
  }

  if ([71, 73, 75, 77].includes(weatherCode)) {
    return "눈";
  }

  if ([80, 81, 82].includes(weatherCode)) {
    return "소나기";
  }

  if ([85, 86].includes(weatherCode)) {
    return "눈 소나기";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "뇌우";
  }

  return "알 수 없음";
};

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
};

type OpenMeteoDailyResponse = {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
};

type OpenMeteoForecastResponse = {
  daily?: OpenMeteoDailyResponse;
};

/*
 * =======================================================
 * Weather Location Aliases
 * =======================================================
 *
 * PHANTOM은 사용자가 입력한 한국어 지명을 그대로 유지한다.
 *
 * Open-Meteo geocoding은 한국어 지명을 안정적으로 찾지 못할 수 있으므로
 * 자주 사용하는 도쿄 지역은 검색용 영문 지명으로 변환한다.
 *
 * 이 값은 날씨를 생성하거나 추측하기 위한 데이터가 아니다.
 * 실제 좌표와 날씨 데이터는 Open-Meteo에서 가져온다.
 */

const WEATHER_LOCATION_ALIASES: Record<string, string> = {
  도쿄: "Tokyo",
  동경: "Tokyo",
  東京: "Tokyo",

  신주쿠: "Shinjuku",
  新宿: "Shinjuku",

  시부야: "Shibuya",
  渋谷: "Shibuya",

  아사쿠사: "Asakusa",
  浅草: "Asakusa",

  우에노: "Ueno",
  上野: "Ueno",

  이케부쿠로: "Ikebukuro",
  池袋: "Ikebukuro",

  긴자: "Ginza",
  銀座: "Ginza",

  아키하바라: "Akihabara",
  秋葉原: "Akihabara",

  오다이바: "Odaiba",
  お台場: "Odaiba",

  도쿄역: "Tokyo",
  東京駅: "Tokyo",
};

const normalizeWeatherLocationQuery = (
  location: string,
): string => {
  const query = location.trim();

  return WEATHER_LOCATION_ALIASES[query] ?? query;
};

export const resolveWeatherLocation = async (
  location: string,
): Promise<WeatherLocation | null> => {
  const originalQuery = location.trim();

  if (!originalQuery) {
    return null;
  }

  const query =
    normalizeWeatherLocationQuery(originalQuery);

  const url = new URL(OPEN_METEO_GEOCODING_URL);

  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "ja");
  url.searchParams.set("countryCode", "JP");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo geocoding failed: ${response.status}`,
    );
  }

  const data =
    (await response.json()) as OpenMeteoGeocodingResponse;

  const result = data.results?.find(
    (item) =>
      typeof item.latitude === "number" &&
      typeof item.longitude === "number",
  );

  if (
    !result ||
    typeof result.latitude !== "number" ||
    typeof result.longitude !== "number"
  ) {
    return null;
  }

  return {
    name: result.name ?? originalQuery,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone ?? "Asia/Tokyo",
    countryCode: result.country_code ?? "JP",
    admin1: result.admin1,
  };
};

export const getWeatherForecast = async (
  location: WeatherLocation,
): Promise<DailyWeather[]> => {
  const url = new URL(OPEN_METEO_FORECAST_URL);

  url.searchParams.set(
    "latitude",
    String(location.latitude),
  );

  url.searchParams.set(
    "longitude",
    String(location.longitude),
  );

  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
    ].join(","),
  );

  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("forecast_days", "7");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo forecast failed: ${response.status}`,
    );
  }

  const data =
    (await response.json()) as OpenMeteoForecastResponse;

  const daily = data.daily;

  if (!daily?.time) {
    return [];
  }

  return daily.time.map((date, index) => ({
  date,
  weatherCode: daily.weather_code?.[index] ?? -1,
  weatherDescription: getWeatherDescription(
    daily.weather_code?.[index] ?? -1,
  ),
  temperatureMax:
    daily.temperature_2m_max?.[index] ?? Number.NaN,
  temperatureMin:
    daily.temperature_2m_min?.[index] ?? Number.NaN,
  precipitationProbabilityMax:
    daily.precipitation_probability_max?.[index] ?? 0,
  precipitationSum:
    daily.precipitation_sum?.[index] ?? 0,
}));
};