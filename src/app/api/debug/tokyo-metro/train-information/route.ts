import { NextResponse } from "next/server";

const ODPT_API_BASE_URL = "https://api.odpt.org/api/v4";

export async function GET() {
  const apiKey = process.env.TOKYO_METRO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "TOKYO_METRO_API_KEY is not configured.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:TokyoMetro",
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          statusText: response.statusText,
          body: text,
        },
        {
          status: response.status,
        },
      );
    }

    const data = JSON.parse(text);

    return NextResponse.json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      information: data,
    });
  } catch (error) {
    console.error(
      "[Tokyo Metro TrainInformation Debug Error]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch Tokyo Metro TrainInformation",
      },
      {
        status: 500,
      },
    );
  }
}