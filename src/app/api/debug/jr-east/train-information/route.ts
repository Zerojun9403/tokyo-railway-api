import { NextResponse } from "next/server";

const ODPT_API_BASE_URL =
  "https://api-challenge.odpt.org/api/v4";

export async function GET() {
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

  try {
    const url = new URL(
      `${ODPT_API_BASE_URL}/odpt:TrainInformation`,
    );

    url.searchParams.set(
      "odpt:operator",
      "odpt.Operator:JR-East",
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

    const summary = Array.isArray(data)
      ? data.map((item) => ({
          id: item["owl:sameAs"],
          date: item["dc:date"],
          valid: item["dct:valid"],
          operator: item["odpt:operator"],
          railway: item["odpt:railway"],
          status:
            item["odpt:trainInformationStatus"],
          text:
            item["odpt:trainInformationText"],
          cause:
            item["odpt:trainInformationCause"],
          range:
            item["odpt:trainInformationRange"],
        }))
      : [];

    return NextResponse.json({
      success: true,
      count: summary.length,
      information: summary,
    });
  } catch (error) {
    console.error(
      "[JR East TrainInformation Debug Error]",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch JR East TrainInformation",
      },
      {
        status: 500,
      },
    );
  }
}