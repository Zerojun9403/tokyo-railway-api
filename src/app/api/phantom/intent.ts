export type PhantomIntentType =
  | "route"
  | "last-train"
  | "weather"
  | "airport"
  | "journey"
  | "general";

export type PhantomRouteIntent = {
  intent: "route";
  departureStation: string;
  arrivalStation: string;
};

export type PhantomLastTrainIntent = {
  intent: "last-train";
  departureStation: string;
  arrivalStation: string;
};

export type PhantomWeatherIntent = {
  intent: "weather";
  location: string;
  dateExpression?: string;
};

export type PhantomAirportIntent = {
  intent: "airport";
  airport?: "NRT" | "HND";
  airline?: string;
};

export type PhantomJourneyIntent = {
  intent: "journey";
};

export type PhantomGeneralIntent = {
  intent: "general";
};

export type PhantomIntent =
  | PhantomRouteIntent
  | PhantomLastTrainIntent
  | PhantomWeatherIntent
  | PhantomAirportIntent
  | PhantomJourneyIntent
  | PhantomGeneralIntent;

export const isPhantomIntent = (
  value: unknown,
): value is PhantomIntent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.intent === "route" ||
    candidate.intent === "last-train"
  ) {
    return (
      typeof candidate.departureStation === "string" &&
      candidate.departureStation.trim().length > 0 &&
      typeof candidate.arrivalStation === "string" &&
      candidate.arrivalStation.trim().length > 0
    );
  }

  if (candidate.intent === "weather") {
    return (
      typeof candidate.location === "string" &&
      candidate.location.trim().length > 0 &&
      (
        candidate.dateExpression === undefined ||
        typeof candidate.dateExpression === "string"
      )
    );
  }

  if (candidate.intent === "airport") {
    return true;
  }

  if (candidate.intent === "journey") {
    return true;
  }

  if (candidate.intent === "general") {
    return true;
  }

  return false;
};