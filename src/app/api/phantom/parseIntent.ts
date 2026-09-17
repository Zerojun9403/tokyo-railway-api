import {
  isPhantomIntent,
  type PhantomIntent,
} from "./intent";

type GeminiIntentResponse = {
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

const buildIntentPrompt = (message: string) => {
  return [
    "사용자의 메시지에서 Tokyo Railway Guide가 처리해야 할 의도를 분석해.",
    "",
    "반드시 JSON 객체 하나만 출력해.",
    "Markdown 코드 블록이나 설명 문장은 출력하지 마.",
    "",
    "가능한 intent:",
    '- "route": 출발역에서 도착역까지 일반적인 철도 경로를 찾는 요청',
    '- "last-train": 출발역에서 도착역까지 갈 수 있는 막차를 찾는 요청',
    '- "weather": 특정 지역의 현재 날씨 또는 일기예보를 묻는 요청',
    '- "airport": 나리타/하네다 공항 또는 항공사 관련 안내 요청',
    '- "journey": 현재 검색되어 있는 철도 경로에 대한 질문',
    '- "general": 그 외 일반적인 여행 질문 또는 대화',
    '- "station-last-train": 특정 역 하나를 기준으로 막차 시간을 묻는 요청',
    "",
    "중요한 분류 규칙:",
    '- 출발역과 도착역을 모두 말하면서 "막차", "마지막 열차", "마지막 전철"을 요청하면 "last-train"으로 분류해.',
    '- 특정 역 하나만 말하면서 그 역의 막차 시간을 묻는 경우에는 "station-last-train"으로 분류해.',
    '- "last-train"과 "station-last-train"을 서로 혼동하지 마.',
    '- 단순히 출발역에서 도착역까지 가는 방법을 묻는 경우에는 "route"로 분류해.',
    '- 막차 질문을 "route"로 분류하지 마.',
    '- 날씨, 비, 눈, 기온, 강수, 일기예보를 묻는 경우에는 "weather"로 분류해.',
    '- weather의 location에는 사용자가 말한 지역 이름을 그대로 사용해.',
    '- weather의 dateExpression에는 "오늘", "내일", "이번 주말"처럼 사용자가 말한 날짜 표현을 그대로 사용해.',
    '- 사용자가 날짜를 말하지 않았다면 dateExpression은 생략해.',
    '- 날짜 표현을 실제 날짜로 임의 변환하거나 추측하지 마.',
    "",
    "예시:",
    '사용자: "신주쿠에서 아사쿠사까지 가는 방법 알려줘"',
    '출력: {"intent":"route","departureStation":"신주쿠","arrivalStation":"아사쿠사"}',
    "",
    '사용자: "신주쿠에서 아사쿠사까지 막차 알려줘"',
    '출력: {"intent":"last-train","departureStation":"신주쿠","arrivalStation":"아사쿠사"}',
    "",
    '사용자: "아사쿠사에서 신주쿠 가는 마지막 전철 몇 시야?"',
    '출력: {"intent":"last-train","departureStation":"아사쿠사","arrivalStation":"신주쿠"}',
    "",
    '사용자: "신주쿠역 막차 몇 시야?"',
    '출력: {"intent":"station-last-train","station":"신주쿠"}',
     "",
    '사용자: "오늘 도쿄 날씨 어때?"',
    '출력: {"intent":"weather","location":"도쿄","dateExpression":"오늘"}',
    "",
    '사용자: "내일 신주쿠 비 와?"',
    '출력: {"intent":"weather","location":"신주쿠","dateExpression":"내일"}',
    "",
    '사용자: "아사쿠사 기온 알려줘"',
    '출력: {"intent":"weather","location":"아사쿠사"}',
    "",
    "route 형식:",
    '{"intent":"route","departureStation":"출발역","arrivalStation":"도착역"}',
    "",
    "last-train 형식:",
    '{"intent":"last-train","departureStation":"출발역","arrivalStation":"도착역"}',
    "",
    "station-last-train 형식:",
    '{"intent":"station-last-train","station":"역 이름"}',
    "",
    "weather 형식:",
    '{"intent":"weather","location":"지역","dateExpression":"날짜 표현"}',
    "",
    "airport 형식:",
    '{"intent":"airport","airport":"NRT 또는 HND","airline":"항공사"}',
    "",
    "journey 형식:",
    '{"intent":"journey"}',
    "",
    "general 형식:",
    '{"intent":"general"}',
    "",
    "역 이름과 지역 이름은 사용자가 말한 이름을 그대로 사용해.",
    "존재하지 않는 역이나 지역을 새로 만들거나 추측하지 마.",
    "",
    "[사용자 메시지]",
    message.trim(),
  ].join("\n");
};

export const parsePhantomIntent = async (
  message: string,
  apiKey: string,
  geminiApiUrl: string,
): Promise<PhantomIntent> => {
  const response = await fetch(geminiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildIntentPrompt(message),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 120,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = (await response.json()) as GeminiIntentResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? "PHANTOM intent request failed",
    );
  }

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  console.log("[PHANTOM Intent Raw]", JSON.stringify(text));
  
  if (!text) {
    throw new Error("PHANTOM intent response is empty");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("PHANTOM intent response is not valid JSON");
  }

  if (!isPhantomIntent(parsed)) {
    throw new Error("PHANTOM intent response has an invalid structure");
  }

  return parsed;
};