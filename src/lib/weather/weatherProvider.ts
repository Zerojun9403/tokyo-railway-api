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

export const resolveWeatherLocation = async (
  location: string,
): Promise<WeatherLocation | null> => {
  const query = location.trim();

  if (!query) {
    return null;
  }

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
    name: result.name ?? query,
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