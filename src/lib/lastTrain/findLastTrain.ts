import type { RailwayTimetable } from "@/types/railway";

/*
 * =========================================================
 * Service Day Time
 * =========================================================
 *
 * 철도 영업일 기준으로 시간을 비교한다.
 *
 * 23:50 -> 1430
 * 00:10 -> 1450
 * 01:00 -> 1500
 *
 * 새벽 03:00 이전 시간은 전날 영업일의 연장으로 취급한다.
 */

const getServiceDayMinutes = (time: string): number => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);

  if (!match) {
    return -1;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return -1;
  }

  const adjustedHour = hour < 3 ? hour + 24 : hour;

  return adjustedHour * 60 + minute;
};

/*
 * =========================================================
 * Find Last Train
 * =========================================================
 *
 * 시간표 전체에서 철도 영업일 기준으로
 * 가장 늦게 출발하는 열차를 반환한다.
 */

export const findLastTrain = (
  timetable: RailwayTimetable[],
): RailwayTimetable | null => {
  let lastTrain: RailwayTimetable | null = null;
  let lastTrainMinutes = -1;

  for (const item of timetable) {
    const serviceDayMinutes = getServiceDayMinutes(item.departureTime);

    if (serviceDayMinutes < 0) {
      continue;
    }

    if (lastTrain === null || serviceDayMinutes > lastTrainMinutes) {
      lastTrain = item;
      lastTrainMinutes = serviceDayMinutes;
    }
  }

  return lastTrain;
};