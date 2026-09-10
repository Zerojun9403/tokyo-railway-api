import { NextResponse } from "next/server";

const ODPT_API_BASE_URL = "https://api.odpt.org/api/v4";

type OdptTrainTimetableObject = {
  "odpt:arrivalTime"?: string;
  "odpt:departureTime"?: string;
  "odpt:arrivalStation"?: string;
  "odpt:departureStation"?: string;
};

type OdptTrainTimetable = {
  "@id"?: string;
  "owl:sameAs"?: string;
  "odpt:trainNumber"?: string;
  "odpt:trainType"?: string;
  "odpt:railDirection"?: string;
  "odpt:destinationStation"?: string[];
  "odpt:trainTimetableObject"?: OdptTrainTimetableObject[];
};

const RAILWAY = "odpt.Railway:TokyoMetro.Ginza";
const ASAKUSA_DIRECTION = "odpt.RailDirection:TokyoMetro.Asakusa";
const KANDA = "odpt.Station:TokyoMetro.Ginza.Kanda";
const ASAKUSA = "odpt.Station:TokyoMetro.Ginza.Asakusa";

const stationIndex = (
  items: OdptTrainTimetableObject[],
  station: string,
): number =>
  items.findIndex(
    (item) =>
      item["odpt:arrivalStation"] === station ||
      item["odpt:departureStation"] === station,
  );

const findStationObject = (
  items: OdptTrainTimetableObject[],
  station: string,
): OdptTrainTimetableObject | undefined =>
  items.find(
    (item) =>
      item["odpt:arrivalStation"] === station ||
      item["odpt:departureStation"] === station,
  );

export const GET = async () => {
  try {
    const apiKey = process.env.TOKYO_METRO_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "TOKYO_METRO_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const url = new URL(`${ODPT_API_BASE_URL}/odpt:TrainTimetable`);

    url.searchParams.set("odpt:operator", "odpt.Operator:TokyoMetro");
    url.searchParams.set("odpt:railway", RAILWAY);
    url.searchParams.set("odpt:railDirection", ASAKUSA_DIRECTION);
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      return NextResponse.json(
        {
          error: "Tokyo Metro TrainTimetable request failed.",
          status: response.status,
          statusText: response.statusText,
          body,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as OdptTrainTimetable[];

    const seen = new Set<string>();

    const trains = data
      .map((train) => {
        if (train["odpt:railDirection"] !== ASAKUSA_DIRECTION) {
          return null;
        }

        const items = train["odpt:trainTimetableObject"] ?? [];

        const kandaIndex = stationIndex(items, KANDA);
        const asakusaIndex = stationIndex(items, ASAKUSA);

        // G13 Kanda가 G19 Asakusa보다 실제 운행 순서상 앞에 있어야 한다.
        if (
          kandaIndex < 0 ||
          asakusaIndex < 0 ||
          kandaIndex >= asakusaIndex
        ) {
          return null;
        }

        const kanda = findStationObject(items, KANDA);
        const asakusa = findStationObject(items, ASAKUSA);

        const departureTime =
          kanda?.["odpt:departureTime"] ??
          kanda?.["odpt:arrivalTime"];

        // 종착역 데이터가 departureTime 형태로 오는 경우도 확인용으로 허용한다.
        const arrivalTime =
          asakusa?.["odpt:arrivalTime"] ??
          asakusa?.["odpt:departureTime"];

        if (!departureTime || !arrivalTime) {
          return null;
        }

        const trainNumber = train["odpt:trainNumber"] ?? "unknown";
        const dedupeKey = `${trainNumber}|${departureTime}|${arrivalTime}`;

        if (seen.has(dedupeKey)) {
          return null;
        }

        seen.add(dedupeKey);

        return {
          trainNumber: train["odpt:trainNumber"],
          railDirection: train["odpt:railDirection"],
          trainType: train["odpt:trainType"],
          destinationStation: train["odpt:destinationStation"],
          departure: {
            station: "G13 Kanda",
            time: departureTime,
            raw: kanda,
          },
          arrival: {
            station: "G19 Asakusa",
            time: arrivalTime,
            raw: asakusa,
          },
        };
      })
      .filter(
        (item): item is NonNullable<typeof item> =>
          item !== null,
      )
      .sort((a, b) =>
        a.departure.time.localeCompare(b.departure.time),
      );

    return NextResponse.json({
      debug: "Tokyo Metro Ginza G13 Kanda -> G19 Asakusa",
      railway: RAILWAY,
      railDirection: ASAKUSA_DIRECTION,
      totalTrainTimetables: data.length,
      matchedTrains: trains.length,
      trains,
    });
  } catch (error) {
    console.error(
      "[Tokyo Metro TrainTimetable Debug API]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
};
