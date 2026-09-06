import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type StationTimetableObjectRaw = {
  "odpt:departureTime"?: string;
  "odpt:arrivalTime"?: string;
  "odpt:trainType"?: string;
  "odpt:destinationStation"?: string[];
};

type StationTimetableRaw = {
  "@id"?: string;
  "odpt:operator"?: string;
  "odpt:railway"?: string;
  "odpt:station"?: string;
  "odpt:railDirection"?: string;
  "odpt:calendar"?: string;
  "odpt:stationTimetableObject"?: StationTimetableObjectRaw[];
};

type OperatorTarget = {
  name: string;
  operatorId: string;
};

const OPERATORS: OperatorTarget[] = [
  {
    name: "JR East",
    operatorId: "odpt.Operator:JR-East",
  },
  {
    name: "Keikyu",
    operatorId: "odpt.Operator:Keikyu",
  },
  {
    name: "Seibu",
    operatorId: "odpt.Operator:Seibu",
  },
  {
    name: "Tokyu",
    operatorId: "odpt.Operator:Tokyu",
  },
  {
    name: "Tokyo Metro",
    operatorId: "odpt.Operator:TokyoMetro",
  },
  {
    name: "Toei",
    operatorId: "odpt.Operator:Toei",
  },
  {
    name: "Keisei",
    operatorId: "odpt.Operator:Keisei",
  },
];

const getApiKey = (): string => {
  const apiKey = process.env.ODPT_API_KEY;

  if (!apiKey) {
    throw new Error("ODPT_API_KEY is not configured");
  }

  return apiKey;
};

const getShortName = (value?: string | null): string => {
  if (!value) {
    return "unknown";
  }

  const colonPart = value.split(":").at(-1) ?? value;

  return colonPart.split(".").at(-1) ?? colonPart;
};

const getServiceDayMinutes = (time: string): number => {
  const [hourText, minuteText] = time.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return -1;
  }

  const adjustedHour = hour < 3 ? hour + 24 : hour;

  return adjustedHour * 60 + minute;
};

const fetchStationTimetables = async (
  operatorId: string,
): Promise<StationTimetableRaw[]> => {
  const apiKey = getApiKey();

  const url = new URL(
    "https://api-challenge.odpt.org/api/v4/odpt:StationTimetable",
  );

  url.searchParams.set("odpt:operator", operatorId);
  url.searchParams.set("acl:consumerKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error([`HTTP ${response.status}`, body.slice(0, 300)].join(" "));
  }

  return (await response.json()) as StationTimetableRaw[];
};

const printOperatorAudit = (
  operator: OperatorTarget,
  data: StationTimetableRaw[],
) => {
  let totalEntries = 0;
  let departureTimeCount = 0;
  let arrivalTimeCount = 0;
  let trainTypeCount = 0;
  let destinationCount = 0;

  let weekdayRecords = 0;
  let saturdayHolidayRecords = 0;
  let otherCalendarRecords = 0;

  let afterMidnightEntries = 0;
  let validLastTrainRecords = 0;

  const railways = new Set<string>();
  const stations = new Set<string>();
  const calendars = new Set<string>();

  const sampleLastTrains: {
    station: string;
    railway: string;
    direction: string;
    calendar: string;
    departureTime: string;
    destination: string;
  }[] = [];

  for (const timetable of data) {
    const railway = getShortName(timetable["odpt:railway"]);
    const station = getShortName(timetable["odpt:station"]);
    const direction = getShortName(timetable["odpt:railDirection"]);
    const calendar = getShortName(timetable["odpt:calendar"]);

    railways.add(railway);
    stations.add(station);
    calendars.add(calendar);

    if (calendar === "Weekday") {
      weekdayRecords += 1;
    } else if (calendar === "SaturdayHoliday") {
      saturdayHolidayRecords += 1;
    } else {
      otherCalendarRecords += 1;
    }

    const objects = timetable["odpt:stationTimetableObject"] ?? [];

    const validDepartures = objects.filter(
      (
        item,
      ): item is StationTimetableObjectRaw & {
        "odpt:departureTime": string;
      } => {
        return typeof item["odpt:departureTime"] === "string";
      },
    );

    for (const item of objects) {
      totalEntries += 1;

      if (item["odpt:departureTime"]) {
        departureTimeCount += 1;

        const hour = Number(item["odpt:departureTime"].split(":")[0]);

        if (Number.isFinite(hour) && hour < 3) {
          afterMidnightEntries += 1;
        }
      }

      if (item["odpt:arrivalTime"]) {
        arrivalTimeCount += 1;
      }

      if (item["odpt:trainType"]) {
        trainTypeCount += 1;
      }

      if (
        item["odpt:destinationStation"] &&
        item["odpt:destinationStation"].length > 0
      ) {
        destinationCount += 1;
      }
    }

    if (validDepartures.length === 0) {
      continue;
    }

    const sorted = [...validDepartures].sort((a, b) => {
      return (
        getServiceDayMinutes(a["odpt:departureTime"]) -
        getServiceDayMinutes(b["odpt:departureTime"])
      );
    });

    const lastTrain = sorted.at(-1);

    if (!lastTrain) {
      continue;
    }

    validLastTrainRecords += 1;

    if (sampleLastTrains.length < 3) {
      const destination =
        lastTrain["odpt:destinationStation"]
          ?.map((value) => getShortName(value))
          .join(", ") ?? "unknown";

      sampleLastTrains.push({
        station,
        railway,
        direction,
        calendar,
        departureTime: lastTrain["odpt:departureTime"],
        destination,
      });
    }
  }

  const percentage = (count: number, total: number): string => {
    if (total === 0) {
      return "0.0%";
    }

    return `${((count / total) * 100).toFixed(1)}%`;
  };

  console.log("");
  console.log("========================================");
  console.log(operator.name);
  console.log("========================================");
  console.log("");

  console.log(`Operator ID: ${operator.operatorId}`);
  console.log(`StationTimetable records: ${data.length}`);
  console.log(`Railways: ${railways.size}`);
  console.log(`Stations: ${stations.size}`);
  console.log("");

  console.log("Calendars:");
  console.log(`  Weekday: ${weekdayRecords}`);
  console.log(`  SaturdayHoliday: ${saturdayHolidayRecords}`);
  console.log(`  Other: ${otherCalendarRecords}`);

  if (calendars.size > 0) {
    console.log(`  Values: ${Array.from(calendars).sort().join(", ")}`);
  }

  console.log("");
  console.log(`Total timetable entries: ${totalEntries}`);
  console.log(
    `departureTime: ${departureTimeCount}/${totalEntries} (${percentage(
      departureTimeCount,
      totalEntries,
    )})`,
  );
  console.log(
    `arrivalTime: ${arrivalTimeCount}/${totalEntries} (${percentage(
      arrivalTimeCount,
      totalEntries,
    )})`,
  );
  console.log(
    `trainType: ${trainTypeCount}/${totalEntries} (${percentage(
      trainTypeCount,
      totalEntries,
    )})`,
  );
  console.log(
    `destination: ${destinationCount}/${totalEntries} (${percentage(
      destinationCount,
      totalEntries,
    )})`,
  );

  console.log("");
  console.log(`After-midnight departures: ${afterMidnightEntries}`);
  console.log(
    `Timetables with calculable last train: ${validLastTrainRecords}/${data.length}`,
  );

  console.log("");
  console.log("Sample last trains:");

  if (sampleLastTrains.length === 0) {
    console.log("  No calculable samples.");
  } else {
    for (const sample of sampleLastTrains) {
      console.log("");
      console.log(`  Station: ${sample.station}`);
      console.log(`  Railway: ${sample.railway}`);
      console.log(`  Direction: ${sample.direction}`);
      console.log(`  Calendar: ${sample.calendar}`);
      console.log(`  Last departure: ${sample.departureTime}`);
      console.log(`  Destination: ${sample.destination}`);
    }
  }

  console.log("");

  if (data.length > 0 && departureTimeCount > 0 && validLastTrainRecords > 0) {
    console.log("RESULT: LAST TRAIN DATA AVAILABLE");
  } else {
    console.log("RESULT: LAST TRAIN DATA NOT AVAILABLE");
  }
};

const main = async () => {
  console.log("");
  console.log("========================================");
  console.log("StationTimetable Coverage Audit");
  console.log("========================================");

  for (const operator of OPERATORS) {
    try {
      const data = await fetchStationTimetables(operator.operatorId);

      printOperatorAudit(operator, data);
    } catch (error) {
      console.log("");
      console.log("========================================");
      console.log(operator.name);
      console.log("========================================");
      console.log("");

      console.log(`Operator ID: ${operator.operatorId}`);

      console.log(
        `FAILED: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("Audit Complete");
  console.log("========================================");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
