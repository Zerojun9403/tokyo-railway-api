/**
 * JR East Narita Express (N'EX) service resolver.
 *
 * N'EX is handled as a service, not as a RailwayProvider.
 * A service can have multiple city-side branches that join at Tokyo and then
 * share one airport-side common section.
 */

const ODPT_API_BASE_URL = "https://api-challenge.odpt.org/api/v4";
const JR_EAST = "odpt.Operator:JR-East";
const LIMITED_EXPRESS = "odpt.TrainType:JR-East.LimitedExpress";

type Calendar = "Weekday" | "SaturdayHoliday";

type OdptTrainTimetableObject = {
  "odpt:arrivalStation"?: string;
  "odpt:arrivalTime"?: string;
  "odpt:departureStation"?: string;
  "odpt:departureTime"?: string;
};

type OdptTrainTimetable = {
  "owl:sameAs"?: string;
  "odpt:railway"?: string;
  "odpt:calendar"?: string;
  "odpt:railDirection"?: string;
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:originStation"?: string[];
  "odpt:destinationStation"?: string[];
  "odpt:trainTimetableObject"?: OdptTrainTimetableObject[];
};

export type NexStop = {
  station: string;
  arrivalTime?: string;
  departureTime?: string;
  railway: string;
};

export type NexTrainPiece = {
  id?: string;
  trainNumber: string;
  railway: string;
  calendar?: string;
  direction?: string;
  originStations: string[];
  destinationStations: string[];
  stops: NexStop[];
};

export type NexBranch = {
  id: string;
  trainNumber: string;
  originStation?: string;
  joinStation: "Tokyo";
  pieces: NexTrainPiece[];
  stops: NexStop[];
};

export type NexCommonSection = {
  trainNumber: string;
  fromStation: "Tokyo";
  destinationStation?: string;
  pieces: NexTrainPiece[];
  stops: NexStop[];
};

export type NexService = {
  operator: "jr-east";
  service: "narita-express";
  primaryTrainNumber: string;
  connectedTrainNumbers: string[];
  branches: NexBranch[];
  commonSection: NexCommonSection;
  pieces: NexTrainPiece[];
};

const getLastSegment = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parts = value.split(".");
  return parts[parts.length - 1];
};

const getCalendar = (): Calendar => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(new Date());

  return weekday === "Sat" || weekday === "Sun"
    ? "SaturdayHoliday"
    : "Weekday";
};

const timeToMinutes = (time?: string): number | undefined => {
  if (!time) return undefined;
  const [hour, minute] = time.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return undefined;
  }

  return hour * 60 + minute;
};

const isAirportStation = (value?: string): boolean =>
  Boolean(value?.includes("NaritaAirport"));

const isNexTimetable = (item: OdptTrainTimetable): boolean => {
  if (item["odpt:trainType"] !== LIMITED_EXPRESS) return false;

  return [
    ...(item["odpt:originStation"] ?? []),
    ...(item["odpt:destinationStation"] ?? []),
  ].some(isAirportStation);
};

const requestTrainTimetable = async (
  params: Record<string, string>,
): Promise<OdptTrainTimetable[]> => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error("ODPT_API_KEY is not configured.");
  }

  const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainTimetable`);
  url.searchParams.set("odpt:operator", JR_EAST);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `N'EX TrainTimetable request failed: ${response.status} ${response.statusText} - ${body}`,
    );
  }

  const body = await response.text();

  if (!body.trim()) {
    throw new Error("N'EX TrainTimetable returned an empty response body.");
  }

  const data = JSON.parse(body) as OdptTrainTimetable[];
  return Array.isArray(data) ? data : [];
};

const toPiece = (item: OdptTrainTimetable): NexTrainPiece | undefined => {
  const trainNumber = item["odpt:trainNumber"];
  const railwayRaw = item["odpt:railway"];

  if (!trainNumber || !railwayRaw) return undefined;

  const railway = getLastSegment(railwayRaw) ?? railwayRaw;

  const stops: NexStop[] = (item["odpt:trainTimetableObject"] ?? []).flatMap(
    (stop) => {
      const station = getLastSegment(
        stop["odpt:departureStation"] ?? stop["odpt:arrivalStation"],
      );

      if (!station) return [];

      return [{
        station,
        arrivalTime: stop["odpt:arrivalTime"],
        departureTime: stop["odpt:departureTime"],
        railway,
      }];
    },
  );

  return {
    id: item["owl:sameAs"],
    trainNumber,
    railway,
    calendar: getLastSegment(item["odpt:calendar"]),
    direction: getLastSegment(item["odpt:railDirection"]),
    originStations: (item["odpt:originStation"] ?? [])
      .map(getLastSegment)
      .filter((value): value is string => Boolean(value)),
    destinationStations: (item["odpt:destinationStation"] ?? [])
      .map(getLastSegment)
      .filter((value): value is string => Boolean(value)),
    stops,
  };
};

const dedupePieces = (pieces: NexTrainPiece[]): NexTrainPiece[] => {
  const seen = new Set<string>();

  return pieces.filter((piece) => {
    const key = `${piece.trainNumber}|${piece.railway}|${piece.calendar ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const loadTrainNumberPieces = async (
  trainNumber: string,
  calendar: Calendar,
): Promise<NexTrainPiece[]> => {
  const data = await requestTrainTimetable({
    "odpt:trainNumber": trainNumber,
  });

  return dedupePieces(
    data
      .filter(isNexTimetable)
      .filter(
        (item) =>
          item["odpt:calendar"] === `odpt.Calendar:${calendar}`,
      )
      .map(toPiece)
      .filter((piece): piece is NexTrainPiece => Boolean(piece)),
  );
};

const getTokyoArrival = (pieces: NexTrainPiece[]): number | undefined => {
  const values = pieces
    .flatMap((piece) => piece.stops)
    .filter((stop) => stop.station === "Tokyo")
    .map((stop) => timeToMinutes(stop.arrivalTime))
    .filter((value): value is number => value !== undefined);

  return values.length ? Math.max(...values) : undefined;
};

const getTokyoDeparture = (pieces: NexTrainPiece[]): number | undefined => {
  const values = pieces
    .flatMap((piece) => piece.stops)
    .filter((stop) => stop.station === "Tokyo")
    .map((stop) => timeToMinutes(stop.departureTime))
    .filter((value): value is number => value !== undefined);

  return values.length ? Math.min(...values) : undefined;
};

const OUTBOUND_BRANCH_ORDER = ["ShonanShinjuku", "Yokosuka"];
const OUTBOUND_COMMON_ORDER = [
  "SobuRapid",
  "Sobu",
  "Narita",
  "NaritaAirportBranch",
];

const sortPieces = (
  pieces: NexTrainPiece[],
  railwayOrder: string[],
): NexTrainPiece[] =>
  [...pieces].sort((a, b) => {
    const ai = railwayOrder.indexOf(a.railway);
    const bi = railwayOrder.indexOf(b.railway);

    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

const mergeStops = (pieces: NexTrainPiece[]): NexStop[] => {
  const result: NexStop[] = [];

  for (const piece of pieces) {
    for (const stop of piece.stops) {
      const existing = result.find(
        (candidate) => candidate.station === stop.station,
      );

      if (existing) {
        existing.arrivalTime ??= stop.arrivalTime;
        existing.departureTime ??= stop.departureTime;
        continue;
      }

      result.push({ ...stop });
    }
  }

  return result;
};

const getOriginStation = (pieces: NexTrainPiece[]): string | undefined => {
  for (const piece of pieces) {
    const origin = piece.originStations[0];
    if (origin) return origin;
  }

  return undefined;
};

const getDestinationStation = (
  pieces: NexTrainPiece[],
): string | undefined => {
  for (const piece of [...pieces].reverse()) {
    const destination = piece.destinationStations[0];
    if (destination) return destination;
  }

  return undefined;
};

const buildBranch = (
  trainNumber: string,
  pieces: NexTrainPiece[],
): NexBranch => {
  const ordered = sortPieces(pieces, OUTBOUND_BRANCH_ORDER);
  const originStation = getOriginStation(ordered);

  return {
    id: `${trainNumber}-${originStation ?? "branch"}-Tokyo`,
    trainNumber,
    originStation,
    joinStation: "Tokyo",
    pieces: ordered,
    stops: mergeStops(ordered),
  };
};

const findConnectedShinjukuBranch = async (
  primaryTrainNumber: string,
  primaryPieces: NexTrainPiece[],
  calendar: Calendar,
): Promise<NexTrainPiece[] | undefined> => {
  const tokyoDeparture = getTokyoDeparture(primaryPieces);
  if (tokyoDeparture === undefined) return undefined;

  // Do NOT fire one ODPT request per 22xx train.
  // Query the two relevant railways once, join them locally by trainNumber,
  // then fetch only the single winning train in full.
  const [shonanData, yokosukaData] = await Promise.all([
    requestTrainTimetable({
      "odpt:railway": "odpt.Railway:JR-East.ShonanShinjuku",
      "odpt:calendar": `odpt.Calendar:${calendar}`,
    }),
    requestTrainTimetable({
      "odpt:railway": "odpt.Railway:JR-East.Yokosuka",
      "odpt:calendar": `odpt.Calendar:${calendar}`,
    }),
  ]);

  const shonanNumbers = new Set(
    shonanData
      .filter(isNexTimetable)
      .map((item) => item["odpt:trainNumber"])
      .filter((value): value is string => Boolean(value))
      .filter((value) => value !== primaryTrainNumber),
  );

  let best:
    | { trainNumber: string; gap: number }
    | undefined;

  for (const item of yokosukaData.filter(isNexTimetable)) {
    const candidateNumber = item["odpt:trainNumber"];

    if (!candidateNumber || !shonanNumbers.has(candidateNumber)) {
      continue;
    }

    const piece = toPiece(item);
    if (!piece) continue;

    const tokyoArrival = getTokyoArrival([piece]);
    if (tokyoArrival === undefined) continue;

    const gap = tokyoDeparture - tokyoArrival;

    // N'EX portions join at Tokyo within a very small window.
    if (gap < 0 || gap > 10) continue;

    if (!best || gap < best.gap) {
      best = { trainNumber: candidateNumber, gap };
    }
  }

  if (!best) return undefined;

  return loadTrainNumberPieces(best.trainNumber, calendar);
};

export const resolveNexService = async (
  trainNumber: string,
): Promise<NexService | undefined> => {
  const calendar = getCalendar();
  const primaryPieces = await loadTrainNumberPieces(trainNumber, calendar);

  if (!primaryPieces.length) {
    return undefined;
  }

  // Current CULLINAN integration target: city -> Narita Airport N'EX.
  const commonPieces = sortPieces(
    primaryPieces.filter((piece) =>
      OUTBOUND_COMMON_ORDER.includes(piece.railway),
    ),
    OUTBOUND_COMMON_ORDER,
  );

  if (!commonPieces.length || getTokyoDeparture(commonPieces) === undefined) {
    return undefined;
  }

  const primaryBranchPieces = primaryPieces.filter(
    (piece) => !OUTBOUND_COMMON_ORDER.includes(piece.railway),
  );

  const branches: NexBranch[] = [];

  if (primaryBranchPieces.length) {
    branches.push(buildBranch(trainNumber, primaryBranchPieces));
  }

  const connectedBranchPieces = await findConnectedShinjukuBranch(
    trainNumber,
    primaryPieces,
    calendar,
  );

  const connectedTrainNumbers = new Set<string>([trainNumber]);
  let allPieces = [...primaryPieces];

  if (connectedBranchPieces?.length) {
    const connectedNumber = connectedBranchPieces[0].trainNumber;
    connectedTrainNumbers.add(connectedNumber);
    branches.push(buildBranch(connectedNumber, connectedBranchPieces));
    allPieces = [...connectedBranchPieces, ...allPieces];
  }

  return {
    operator: "jr-east",
    service: "narita-express",
    primaryTrainNumber: trainNumber,
    connectedTrainNumbers: [...connectedTrainNumbers],
    branches,
    commonSection: {
      trainNumber,
      fromStation: "Tokyo",
      destinationStation: getDestinationStation(commonPieces),
      pieces: commonPieces,
      stops: mergeStops(commonPieces),
    },
    pieces: allPieces,
  };
};

/**
 * Loads today's outbound N'EX primary services (Tokyo -> Narita Airport side).
 *
 * Important:
 * - Returns only primary/common-section train numbers.
 * - Connected 22xx Shinjuku branch numbers are resolved later by resolveNexService().
 * - This avoids hard-coding pairs such as 2001M <-> 2201M.
 */
export const listOutboundNexTrainNumbers = async (): Promise<string[]> => {
  const calendar = getCalendar();

  /*
   * NaritaAirportBranch is the safest discovery point for outbound N'EX:
   * every returned service here is already on the airport-side common section.
   */
  const data = await requestTrainTimetable({
    "odpt:railway": "odpt.Railway:JR-East.NaritaAirportBranch",
    "odpt:calendar": `odpt.Calendar:${calendar}`,
  });

  const numbers = data
    .filter(isNexTimetable)
    .filter(
      (item) =>
        item["odpt:calendar"] === `odpt.Calendar:${calendar}`,
    )
    .filter((item) =>
      (item["odpt:destinationStation"] ?? []).some(isAirportStation),
    )
    .map((item) => item["odpt:trainNumber"])
    .filter((value): value is string => Boolean(value));

  return [...new Set(numbers)].sort((a, b) => {
    const aNumber = Number.parseInt(a, 10);
    const bNumber = Number.parseInt(b, 10);

    if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
      return aNumber - bNumber;
    }

    return a.localeCompare(b);
  });
};

/**
 * Resolves all of today's outbound N'EX services.
 *
 * Calls are intentionally sequential. The previous diagnostic showed that
 * flooding ODPT with many parallel requests can return an empty response body.
 */
export const resolveOutboundNexServices = async (): Promise<NexService[]> => {
  const trainNumbers = await listOutboundNexTrainNumbers();
  const services: NexService[] = [];

  for (const trainNumber of trainNumbers) {
    const service = await resolveNexService(trainNumber);

    if (service) {
      services.push(service);
    }
  }

  return services;
};

