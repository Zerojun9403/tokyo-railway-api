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
const KANDA = "odpt.Station:TokyoMetro.Ginza.Kanda";
const ASAKUSA = "odpt.Station:TokyoMetro.Ginza.Asakusa";

const hasStation = (items: OdptTrainTimetableObject[], station: string) =>
  items.some(
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
    url.searchParams.set("acl:consumerKey", apiKey);

    const response = await fetch(url, { cache: "no-store" });

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

    const trains = data
      .map((train) => {
        const items = train["odpt:trainTimetableObject"] ?? [];

        if (!hasStation(items, KANDA) || !hasStation(items, ASAKUSA)) {
          return null;
        }

        const kanda = items.find(
          (item) =>
            item["odpt:departureStation"] === KANDA ||
            item["odpt:arrivalStation"] === KANDA,
        );

        const asakusa = items.find(
          (item) =>
            item["odpt:arrivalStation"] === ASAKUSA ||
            item["odpt:departureStation"] === ASAKUSA,
        );

        const departureTime =
          kanda?.["odpt:departureTime"] ?? kanda?.["odpt:arrivalTime"];

        const arrivalTime =
          asakusa?.["odpt:arrivalTime"] ?? asakusa?.["odpt:departureTime"];

        if (!departureTime || !arrivalTime) return null;

        return {
          trainNumber: train["odpt:trainNumber"],
          railDirection: train["odpt:railDirection"],
          trainType: train["odpt:trainType"],
          destinationStation: train["odpt:destinationStation"],
          kanda: { departureTime, raw: kanda },
          asakusa: { arrivalTime, raw: asakusa },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) =>
        a.kanda.departureTime.localeCompare(b.kanda.departureTime),
      );

    return NextResponse.json({
      debug: "Tokyo Metro Ginza G13 Kanda -> G19 Asakusa",
      railway: RAILWAY,
      totalTrainTimetables: data.length,
      matchedTrains: trains.length,
      trains,
    });
  } catch (error) {
    console.error("[Tokyo Metro TrainTimetable Debug API]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
