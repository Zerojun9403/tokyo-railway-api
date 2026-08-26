import type { RailwayOperator } from "@/types/railway";

import type { RailwayProvider } from "./types";

import { tokyoMetroProvider } from "./tokyoMetroProvider";

import { toeiProvider } from "./toeiProvider";
import { jrEastProvider } from "./jrEastProvider";
import { keiseiProvider } from "./keiseiProvider";
import { keikyuProvider } from "./keikyuProvider";
import { seibuProvider } from "./seibuProvider";
import { tokyuProvider } from "./tokyuProvider";

const providers: Partial<
  Record<RailwayOperator, RailwayProvider>
> = {
  "tokyo-metro": tokyoMetroProvider,
  toei: toeiProvider,
  "jr-east": jrEastProvider,
  keisei: keiseiProvider,
  keikyu: keikyuProvider,
  seibu: seibuProvider,
  tokyu: tokyuProvider,
};

export const registerProvider = (
  provider: RailwayProvider,
) => {
  providers[provider.operator] = provider;
};

export const getProvider = (
  operator: RailwayOperator,
): RailwayProvider | undefined => {
  return providers[operator];
};

export const hasProvider = (
  operator: RailwayOperator,
): boolean => {
  return Boolean(providers[operator]);
};