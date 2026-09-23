import type { SimulationEvent, SimulationState } from "./types";
export function emitEvent(state: SimulationState, event: Omit<SimulationEvent, "id" | "at">) {
  state.events.push({ ...event, id: state.nextEventId++, at: state.time });
  if (state.events.length > 24) state.events.shift();
}
