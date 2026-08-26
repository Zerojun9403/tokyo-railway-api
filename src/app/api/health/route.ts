import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.json({
    status: "ok",
    service: "tokyo-railway-api",
    message: "Tokyo Railway API is running",
  });
};