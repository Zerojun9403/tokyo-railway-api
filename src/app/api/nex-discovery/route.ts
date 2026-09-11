import {
  listOutboundNexTrainNumbers,
  resolveNexService,
} from "@/lib/services/nexService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trainNumbers = await listOutboundNexTrainNumbers();

    /*
     * 자동 탐색 자체를 검증하는 엔드포인트다.
     * 모든 서비스를 한 번에 resolve하면 ODPT 요청 수가 크게 늘어나므로,
     * 여기서는 발견된 번호와 대표 2편만 실제 service resolver로 확인한다.
     */
    const sampleNumbers = [
      trainNumbers[0],
      trainNumbers[Math.floor(trainNumbers.length / 2)],
    ].filter(
      (value, index, values): value is string =>
        Boolean(value) && values.indexOf(value) === index,
    );

    const samples = [];

    for (const trainNumber of sampleNumbers) {
      const service = await resolveNexService(trainNumber);

      samples.push({
        trainNumber,
        resolved: Boolean(service),
        connectedTrainNumbers:
          service?.connectedTrainNumbers ?? [],
        branches:
          service?.branches.map((branch) => ({
            trainNumber: branch.trainNumber,
            originStation: branch.originStation,
            joinStation: branch.joinStation,
          })) ?? [],
        commonSection: service
          ? {
              trainNumber:
                service.commonSection.trainNumber,
              fromStation:
                service.commonSection.fromStation,
              destinationStation:
                service.commonSection.destinationStation,
            }
          : null,
      });
    }

    return Response.json({
      ok: true,
      count: trainNumbers.length,
      trainNumbers,
      samples,
    });
  } catch (error) {
    console.error("N'EX discovery test failed:", error);

    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown N'EX discovery error",
      },
      { status: 500 },
    );
  }
}
