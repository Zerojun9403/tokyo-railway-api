import { NextRequest, NextResponse } from "next/server";
import { resolveNexService } from "@/lib/services/nexService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const trainNumber =
      request.nextUrl.searchParams.get("trainNumber")?.trim() || "2001M";

    const service = await resolveNexService(trainNumber);

    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          trainNumber,
          message: "N'EX service를 찾지 못했습니다.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      trainNumber,
      service,
    });
  } catch (error) {
    console.error("[NEX TEST]", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unknown N'EX test error",
      },
      { status: 500 },
    );
  }
}
