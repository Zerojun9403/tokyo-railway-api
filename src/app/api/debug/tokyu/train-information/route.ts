import { NextResponse } from "next/server";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

export async function GET() {
  try {
    const apiKey = process.env.ODPT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "ODPT_API_KEY is not configured.",
        },
        {
          status: 500,
        },
      );
    }

    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:Tokyu",
    );

    url.searchParams.set(
      "acl:consumerKey",
      apiKey,
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          body,
        },
        {
          status: response.status,
        },
      );
    }

    const information = JSON.parse(body);

    return NextResponse.json({
      success: true,
      count: Array.isArray(information)
        ? information.length
        : 0,
      information,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
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
}