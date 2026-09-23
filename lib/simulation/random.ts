import type { SimulationState } from "./types";
export function random(state: SimulationState): number {
  state.randomSeed = (Math.imul(1664525, state.randomSeed) + 1013904223) >>> 0;
  return state.randomSeed / 4294967296;
}
export function incidentRandom(state: SimulationState): number {
  state.incidentSeed = (Math.imul(1664525, state.incidentSeed) + 1013904223) >>> 0;
  return state.incidentSeed / 4294967296;
}
