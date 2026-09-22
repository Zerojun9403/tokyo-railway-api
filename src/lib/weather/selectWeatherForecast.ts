import type { DailyWeather } from "./weatherProvider";

const TOKYO_TIME_ZONE = "Asia/Tokyo";

const getTokyoDate = (dayOffset = 0): string => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);

  const year = Number(
    parts.find((part) => part.type === "year")?.value,
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value,
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value,
  );

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error("Failed to resolve Asia/Tokyo date");
  }

  const targetDate = new Date(
    Date.UTC(year, month - 1, day + dayOffset),
  );

  return targetDate.toISOString().slice(0, 10);
};

export type WeatherForecastSelection = {
  requestedDate: string;
  forecast: DailyWeather;
};

export const selectWeatherForecast = (
  forecast: DailyWeather[],
  dateExpression?: string,
): WeatherForecastSelection | null => {
  const expression = dateExpression?.trim();

  let requestedDate: string;

  if (!expression || expression === "오늘") {
    requestedDate = getTokyoDate(0);
  } else if (expression === "내일") {
    requestedDate = getTokyoDate(1);
  } else {
    return null;
  }

  const selectedForecast = forecast.find(
    (item) => item.date === requestedDate,
  );

  if (!selectedForecast) {
    return null;
  }

  return {
    requestedDate,
    forecast: selectedForecast,
  };
};