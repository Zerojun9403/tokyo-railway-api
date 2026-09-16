export type PhantomIntentType =
  | "route"
  | "airport"
  | "journey"
  | "general";

export type PhantomRouteIntent = {
  intent: "route";
  departureStation: string;
  arrivalStation: string;
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

  if (candidate.intent === "route") {
    return (
      typeof candidate.departureStation === "string" &&
      candidate.departureStation.trim().length > 0 &&
      typeof candidate.arrivalStation === "string" &&
      candidate.arrivalStation.trim().length > 0
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