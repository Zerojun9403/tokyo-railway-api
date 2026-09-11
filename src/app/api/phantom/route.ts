import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type PhantomJourneySegment = {
  fromStation: string;
  toStation: string;
  lineName?: string;
  trainNumber?: string;
  trainType?: string;
  departureTime: string;
  arrivalTime: string;
};

type PhantomJourney = {
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  transferCount: number;
  segments: PhantomJourneySegment[];
};

type PhantomAirport = {
  airport: "NRT" | "HND";
  airline: string;
};

type PhantomRequest = {
  message?: string;
  journey?: PhantomJourney;
  airport?: PhantomAirport;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isValidJourney = (journey: unknown): journey is PhantomJourney => {
  if (!journey || typeof journey !== "object") {
    return false;
  }

  const value = journey as Partial<PhantomJourney>;

  if (
    !isNonEmptyString(value.departureStation) ||
    !isNonEmptyString(value.arrivalStation) ||
    !isNonEmptyString(value.departureTime) ||
    !isNonEmptyString(value.arrivalTime) ||
    !Number.isInteger(value.transferCount) ||
    !Array.isArray(value.segments) ||
    value.segments.length === 0
  ) {
    return false;
  }

  return value.segments.every((segment) => {
    if (!segment || typeof segment !== "object") {
      return false;
    }

    const item = segment as Partial<PhantomJourneySegment>;

    return (
      isNonEmptyString(item.fromStation) &&
      isNonEmptyString(item.toStation) &&
      isNonEmptyString(item.departureTime) &&
      isNonEmptyString(item.arrivalTime)
    );
  });
};

const buildJourneyPrompt = (journey: PhantomJourney) => {
  const segmentText = journey.segments
    .map((segment, index) => {
      const details = [
        segment.lineName ? `노선: ${segment.lineName}` : null,
        segment.trainNumber ? `열차번호: ${segment.trainNumber}` : null,
        segment.trainType ? `열차종별: ${segment.trainType}` : null,
      ]
        .filter(Boolean)
        .join(" / ");

      return [
        `[구간 ${index + 1}]`,
        `${segment.fromStation} → ${segment.toStation}`,
        details || null,
        `출발 ${segment.departureTime} / 도착 ${segment.arrivalTime}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    "다음은 CULLINAN이 확정한 실제 철도 여정이다.",
    "아래 사실만 사용해서 여행자가 지금 무엇을 해야 하는지 한국어로 짧고 명확하게 설명해줘.",
    "새로운 경로, 열차, 시각, 역, 노선, 환승 정보를 추가하거나 추측하지 마.",
    "",
    `[전체 여정]`,
    `출발역: ${journey.departureStation}`,
    `도착역: ${journey.arrivalStation}`,
    `출발시각: ${journey.departureTime}`,
    `도착시각: ${journey.arrivalTime}`,
    `환승횟수: ${journey.transferCount}회`,
    "",
    segmentText,
  ].join("\n");
};


const AIRPORT_GUIDE = {
  NRT: {
    airportName: "나리타 국제공항",
    groups: [
      {
        station: "나리타공항역",
        terminals: [
          {
            terminal: "제1터미널 북쪽윙",
            airlines: ["대한항공", "진에어", "피치항공", "ZIPAIR"],
          },
          {
            terminal: "제1터미널 남쪽윙",
            airlines: [
              "에어서울",
              "에어부산",
              "아시아나항공",
              "에티오피아항공",
            ],
          },
        ],
      },
      {
        station: "공항 제2빌딩역",
        terminals: [
          {
            terminal: "제2터미널",
            airlines: ["트리니티항공", "에어프레미아", "파라타항공"],
          },
          {
            terminal: "제3터미널",
            airlines: ["이스타항공", "제주항공", "에어로케이"],
          },
        ],
      },
    ],
  },
  HND: {
    airportName: "하네다공항",
    groups: [
      {
        station: "하네다공항 제1·제2터미널역",
        terminals: [
          {
            terminal: "제2터미널",
            airlines: ["ANA"],
          },
        ],
      },
      {
        station: "하네다공항 제3터미널역",
        terminals: [
          {
            terminal: "제3터미널",
            airlines: ["대한항공", "아시아나항공", "일본항공"],
          },
        ],
      },
    ],
  },
} as const;

const buildAirportPrompt = (airport: PhantomAirport): string | null => {
  const guide = AIRPORT_GUIDE[airport.airport];

  for (const group of guide.groups) {
    for (const terminal of group.terminals) {
      if (
        terminal.airlines.some(
          (airline) =>
            airline.toLocaleLowerCase() === airport.airline.trim().toLocaleLowerCase(),
        )
      ) {
        return [
          "다음은 SPECTRE가 제공한 확정 공항 안내 데이터다.",
          "아래 정보만 사용해서 여행자에게 한국어로 짧고 명확하게 안내해줘.",
          "입력에 없는 공항역, 터미널, 항공사, 체크인 카운터 정보를 만들거나 추측하지 마.",
          "",
          `공항: ${guide.airportName} (${airport.airport})`,
          `항공사: ${airport.airline.trim()}`,
          `이용 철도역: ${group.station}`,
          `터미널: ${terminal.terminal}`,
          "",
          "마지막에는 출발 당일 예약 정보와 공항 내 FIDS에서 체크인 카운터 및 터미널을 다시 확인하라고 안내해줘.",
        ].join("\n");
      }
    }
  }

  return null;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

async function handlePost(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "GEMINI_API_KEY is not configured",
      },
      {
        status: 500,
      },
    );
  }

  let body: PhantomRequest;

  try {
    body = (await request.json()) as PhantomRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      {
        status: 400,
      },
    );
  }

  const message = body.message?.trim();
  const journey = body.journey;
  const airport = body.airport;

  let prompt: string;
  let mode: "message" | "journey" | "airport";

  if (isValidJourney(journey)) {
    prompt = buildJourneyPrompt(journey);
    mode = "journey";
  } else if (
    airport &&
    (airport.airport === "NRT" || airport.airport === "HND") &&
    isNonEmptyString(airport.airline)
  ) {
    const airportPrompt = buildAirportPrompt(airport);

    if (!airportPrompt) {
      return NextResponse.json(
        {
          ok: false,
          error: "Airline is not registered in the SPECTRE airport guide",
        },
        {
          status: 404,
        },
      );
    }

    prompt = airportPrompt;
    mode = "airport";
  } else if (message) {
    prompt = message;
    mode = "message";
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: "message, valid journey, or valid airport request is required",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "너는 Tokyo Railway Guide의 PHANTOM AI다. " +
                "사용자에게 한국어로 짧고 명확하게 안내한다. " +
                "철도 경로와 실제 열차에 관한 사실은 입력으로 제공된 정보만 사용한다. " +
                "입력에 없는 열차, 시각, 역, 노선, 환승 정보를 임의로 만들거나 추측하지 않는다. " +
                "CULLINAN이 계산한 결과를 변경하지 말고 여행자가 이해하기 쉽게 설명한다. " +
                "확인할 수 없는 정보는 모른다고 명확하게 말한다.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok) {
      console.error("[PHANTOM Gemini API Error]", data);

      return NextResponse.json(
        {
          ok: false,
          error: data.error?.message ?? "Gemini API request failed",
        },
        {
          status: response.status,
        },
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gemini returned an empty response",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      engine: "PHANTOM",
      model: GEMINI_MODEL,
      mode,
      text,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[PHANTOM API Error]", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to call PHANTOM AI",
      },
      {
        status: 500,
      },
    );
  }
}


export async function POST(request: NextRequest) {
  const response = await handlePost(request);

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}
