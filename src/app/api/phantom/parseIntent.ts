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
    '- "route": 출발역에서 도착역까지 철도 경로를 찾는 요청',
    '- "airport": 나리타/하네다 공항 또는 항공사 관련 안내 요청',
    '- "journey": 현재 검색되어 있는 철도 경로에 대한 질문',
    '- "general": 그 외 일반적인 여행 질문 또는 대화',
    "",
    'route 형식:',
    '{"intent":"route","departureStation":"출발역","arrivalStation":"도착역"}',
    "",
    'airport 형식:',
    '{"intent":"airport","airport":"NRT 또는 HND","airline":"항공사"}',
    "",
    'journey 형식:',
    '{"intent":"journey"}',
    "",
    'general 형식:',
    '{"intent":"general"}',
    "",
    "역 이름은 사용자가 말한 이름을 그대로 사용해.",
    "존재하지 않는 역을 새로 만들거나 추측하지 마.",
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