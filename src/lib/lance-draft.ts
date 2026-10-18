import { DEFAULT_LANCE_MODALITY } from "./lance-calc";

/** A fresh negotiation never inherits example or previously saved bids. */
export function createLanceDraft() {
  return { embeddedPct: "0", cashPct: "0", modality: DEFAULT_LANCE_MODALITY };
}