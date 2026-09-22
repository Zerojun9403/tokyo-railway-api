import { NextRequest, NextResponse } from "next/server";

import { findLastTrain } from "@/lib/lastTrain/findLastTrain";
import { normalizeLastTrainRequest } from "@/lib/lastTrain/normalizeLastTrainRequest";
import { STATION_LAST_TRAIN_REGISTRY } from "@/lib/lastTrain/stationLineRegistry";
import { getProvider } from "@/lib/providers/providerRegistry";
import {
  getWeatherForecast,
  resolveWeatherLocation,
} from "@/lib/weather/weatherProvider";
import { selectWeatherForecast } from "@/lib/weather/selectWeatherForecast";

import { parsePhantomIntent } from "./parseIntent";

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

const buildJourneyQuestionPrompt = (
  journey: PhantomJourney,
  message: string,
) => {
  return [
    buildJourneyPrompt(journey),
    "",
    "[사용자 질문]",
    message.trim(),
    "",
    "위 CULLINAN 여정 정보만 사용해서 사용자의 질문에 답해줘.",
    "질문에 필요한 정보가 위 여정에 없으면 추측하지 말고 확인할 수 없다고 말해줘.",
    "Markdown 문법(**, *, #, 목록 기호 등)을 사용하지 말고 일반 텍스트로 답변해줘.",
  ].join("\n");
};

const buildGeneralPrompt = (message: string) => {
  return [
    "너는 Tokyo Railway Guide의 여행 어시스턴트 PHANTOM이다.",
    "사용자의 일반적인 여행 질문이나 대화에 한국어로 자연스럽고 간결하게 답해줘.",
    "",
    "중요:",
    "실시간 또는 실제 철도 운행 시각, 막차 시각, 열차 번호, 환승 경로, 공항 터미널, 날씨처럼 검증된 데이터가 필요한 정보는 추측하거나 만들어내지 마.",
    "현재 제공된 검증 데이터가 없는 정보라면 확인할 수 없다고 명확하게 말해줘.",
    "일반적인 여행 상식이나 대화는 답변해도 된다.",
    "Markdown 문법(**, *, #, 목록 기호 등)을 사용하지 말고 일반 텍스트로 답변해줘.",
    "",
    "[사용자 메시지]",
    message.trim(),
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
          "아래 정보만 사용해서 한국어로 매우 짧게 안내해줘.",
          "설명문, 인사말, 주의사항, FIDS 안내는 출력하지 마.",
          "Markdown 문법(**, *, #, -, 목록 기호 등)을 절대 사용하지 마.",
          "입력에 없는 공항역, 터미널, 항공사 정보를 만들거나 추측하지 마.",
          "반드시 아래 4줄만 그대로 읽기 쉬운 일반 텍스트 형식으로 출력해.",
          "",
          `${guide.airportName} (${airport.airport})`,
          `${airport.airline.trim()}`,
          `${group.station}`,
          `${terminal.terminal}`,
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
  


  let prompt: string = message ?? "";
  let mode:
    | "message"
    | "journey"
    | "airport"
    | "station-last-train"
    | "weather" = "message";

  if (isValidJourney(journey) && message) {
    prompt = buildJourneyQuestionPrompt(journey, message);
    mode = "journey";
  } else if (isValidJourney(journey)) {
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
    const intent = await parsePhantomIntent(
      message,
      apiKey,
      GEMINI_API_URL,
    );
if (
  intent.intent === "airport" &&
  (intent.airport === "NRT" || intent.airport === "HND") &&
  isNonEmptyString(intent.airline)
) {
  const airportPrompt = buildAirportPrompt({
    airport: intent.airport,
    airline: intent.airline,
  });

  if (!airportPrompt) {
    return NextResponse.json(
      {
        ok: false,
        engine: "PHANTOM",
        mode: "airport",
        error: "Airline is not registered in the SPECTRE airport guide",
      },
      {
        status: 404,
        headers: CORS_HEADERS,
      },
    );
  }

  prompt = airportPrompt;
  mode = "airport";
}

if (intent.intent === "route") {
  return NextResponse.json(
    {
      ok: true,
      engine: "PHANTOM",
      mode: "route-intent",
      intent,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: CORS_HEADERS,
    },
  );
}

if (intent.intent === "last-train") {
  return NextResponse.json(
    {
      ok: true,
      engine: "PHANTOM",
      mode: "last-train-intent",
      intent,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: CORS_HEADERS,
    },
  );
}

if (intent.intent === "station-last-train") {
  /*
   * =======================================================
   * Resolve Station
   * =======================================================
   *
   * PHANTOM parser가 반환한 역 이름을
   * station-last-train registry의 canonical station으로 찾는다.
   *
   * 현재는 등록된 역의 한국어 / 일본어 / 영어 이름과
   * stationKey를 기준으로 매칭한다.
   */

  const stationQuery = intent.station.trim().toLowerCase();

  const station = STATION_LAST_TRAIN_REGISTRY.find((item) => {
    const candidates = [
      item.stationKey,
      item.nameKo,
      item.nameJa,
      item.nameEn,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase());

    return candidates.includes(stationQuery);
  });

  if (!station) {
    return NextResponse.json(
      {
        ok: false,
        engine: "PHANTOM",
        mode: "station-last-train",
        error: `Station is not registered: ${intent.station}`,
      },
      {
        status: 404,
        headers: CORS_HEADERS,
      },
    );
  }

  /*
   * =======================================================
   * Collect Verified Last Trains
   * =======================================================
   */

  const lines = await Promise.all(
    station.lines.map(async (line) => {
      const directions = await Promise.all(
        line.directions.map(async (direction) => {
          try {
            const normalized = normalizeLastTrainRequest({
              operator: line.operator,
              lineId: line.lineId,
              stationId: line.stationId,
              directionId: direction.directionId,
            });

            const provider = getProvider(line.operator);

            if (!provider?.getTimetable) {
              return {
                directionKo: direction.directionKo,
                directionJa: direction.directionJa,
                found: false,
                lastTrain: null,
              };
            }

            const timetable = await provider.getTimetable({
              operator: normalized.operator,
              lineId: normalized.lineId,
              stationId: normalized.stationId,
              directionId: normalized.directionId,
            });

            const lastTrain = findLastTrain(timetable);

            if (!lastTrain) {
              return {
                directionKo: direction.directionKo,
                directionJa: direction.directionJa,
                found: false,
                lastTrain: null,
              };
            }

            return {
              directionKo: direction.directionKo,
              directionJa: direction.directionJa,
              found: true,
              lastTrain: {
                departureTime: lastTrain.departureTime,
                trainTypeKo: lastTrain.trainTypeKo,
                trainTypeJa: lastTrain.trainTypeJa,
                destinationKo: lastTrain.destinationKo,
                destinationJa: lastTrain.destinationJa,
              },
            };
          } catch (error) {
            console.error(
              `[PHANTOM Station Last Train Error] ${line.operator} ${line.lineId} ${direction.directionId}`,
              error,
            );

            return {
              directionKo: direction.directionKo,
              directionJa: direction.directionJa,
              found: false,
              lastTrain: null,
            };
          }
        }),
      );

      return {
        operator: line.operator,
        lineNameKo: line.lineNameKo,
        lineNameJa: line.lineNameJa,
        directions,
      };
    }),
  );

  /*
   * =======================================================
   * Build PHANTOM Prompt
   * =======================================================
   *
   * Gemini는 막차 정보를 계산하지 않는다.
   * Provider에서 검증된 결과를 사용자에게 설명만 한다.
   */

  prompt =
    `사용자가 "${message}"라고 질문했다.\n\n` +
    `아래는 ${station.nameKo}역의 철도 시간표에서 확인한 막차 정보다.\n` +
    `이 데이터에 있는 정보만 사용해서 답변해라.\n` +
    `방향명과 실제 막차 종착역은 서로 다를 수 있으므로 구분해서 설명해라.\n` +
    `found가 false인 방향은 막차 시각을 추측하지 마라.\n` +
    `여러 노선이 있으므로 노선별로 짧고 읽기 쉽게 정리해라.\n\n` +
    `Markdown 문법(**, *, #, 목록 기호 등)을 사용하지 말고 일반 텍스트로 답변해라.\n\n` +
    JSON.stringify(
      {
        station: {
          nameKo: station.nameKo,
          nameJa: station.nameJa,
        },
        lines,
      },
      null,
      2,
    );

  mode = "station-last-train";
}

if (intent.intent === "weather") {
  const weatherLocation = await resolveWeatherLocation(
    intent.location,
  );

  if (!weatherLocation) {
    return NextResponse.json(
      {
        ok: false,
        engine: "PHANTOM",
        mode: "weather",
        error: `Weather location was not found: ${intent.location}`,
      },
      {
        status: 404,
        headers: CORS_HEADERS,
      },
    );
  }

  const forecast = await getWeatherForecast(
    weatherLocation,
  );

  if (forecast.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        engine: "PHANTOM",
        mode: "weather",
        error: `Weather forecast was not found: ${intent.location}`,
      },
      {
        status: 502,
        headers: CORS_HEADERS,
      },
    );
  }

  const selectedWeather = selectWeatherForecast(
    forecast,
    intent.dateExpression,
  );

  if (!selectedWeather) {
    return NextResponse.json(
      {
        ok: false,
        engine: "PHANTOM",
        mode: "weather",
        error: intent.dateExpression
          ? `Weather date expression is not supported: ${intent.dateExpression}`
          : `Weather forecast was not found for today: ${intent.location}`,
      },
      {
        status: 400,
        headers: CORS_HEADERS,
      },
    );
  }

  prompt =
    `사용자가 "${message}"라고 질문했다.\n\n` +
    `아래는 Open-Meteo에서 확인한 실제 날씨 예보 데이터다.\n` +
    `서버가 Asia/Tokyo 기준으로 사용자가 요청한 날짜를 이미 확정했다.\n` +
    `날짜를 다시 계산하거나 다른 날짜의 데이터를 선택하지 마라.\n` +
    `아래 selectedForecast에 있는 정보만 사용해서 한국어로 짧고 명확하게 답변해라.\n` +
    `weatherCode, 기온, 강수확률, 강수량을 임의로 만들거나 추측하지 마라.\n` +
    `지역명은 아래 geocoding 결과를 기준으로 사용해라.\n` +
    `Markdown 문법(**, *, #, 목록 기호 등)을 사용하지 말고 일반 텍스트로 답변해라.\n\n` +
    JSON.stringify(
      {
        requestedLocation: intent.location,
        resolvedLocation: weatherLocation,
        dateExpression: intent.dateExpression,
        requestedDate: selectedWeather.requestedDate,
        selectedForecast: selectedWeather.forecast,
      },
      null,
      2,
    );

  mode = "weather";
}

if (
  intent.intent !== "station-last-train" &&
  intent.intent !== "weather" &&
  intent.intent !== "airport"
) {
  prompt =
    intent.intent === "general"
      ? buildGeneralPrompt(message)
      : message;

  mode = "message";
}

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