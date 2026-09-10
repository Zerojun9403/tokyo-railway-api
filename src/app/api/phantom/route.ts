import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type PhantomRequest = {
  message?: string;
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

export async function POST(request: NextRequest) {
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

  if (!message) {
    return NextResponse.json(
      {
        ok: false,
        error: "message is required",
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
                "사용자에게 한국어로 짧고 명확하게 답한다. " +
                "현재 단계는 연결 테스트이므로 입력된 내용을 임의로 확장하거나 " +
                "존재하지 않는 철도 정보, 열차 시각, 경로를 만들어내지 않는다.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: message,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
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
