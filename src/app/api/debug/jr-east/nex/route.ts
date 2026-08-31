import { NextResponse } from "next/server";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

type OdptTrainTimetable = Record<string, unknown>;

const containsNexKeyword = (
  value: unknown,
): boolean => {
  const text = JSON.stringify(value).toLowerCase();

  return (
    text.includes("narita") ||
    text.includes("naritaexpress") ||
    text.includes("n'ex") ||
    text.includes("nex") ||
    text.includes("成田エクスプレス")
  );
};

export const GET = async () => {
  try {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "ODPT_API_KEY is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainTimetable`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:JR-East",
    );

    url.searchParams.set(
      "odpt:trainType",
      "odpt.TrainType:JR-East.LimitedExpress",
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "JR East TrainTimetable request failed.",
          status: response.status,
          statusText: response.statusText,
        },
        {
          status: response.status,
        },
      );
    }

    const data =
      (await response.json()) as OdptTrainTimetable[];

    const matches = data
      .filter(containsNexKeyword)
      .slice(0, 5);

    return NextResponse.json({
      totalTrainTimetables: data.length,
      nexMatches: matches.length,
      matches,
    });
  } catch (error) {
    console.error(
      "[JR East NEX Debug API]",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
};