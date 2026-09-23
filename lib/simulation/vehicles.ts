import { random } from "./random";
import type { SimulationSettings, SimulationState, Vehicle, VehicleClassConfig, VehicleMix, VehicleType } from "./types";

const define = (type: VehicleType, label: string, length: number, width: number, maxSpeed: number, acceleration: number, deceleration: number, followingGap: number, visualStyle: VehicleClassConfig["visualStyle"], passengerValue = 1, idleWeight = 1, emergency = false): VehicleClassConfig => ({ type, label, length, width, maxSpeed, acceleration, deceleration, followingGap, visualStyle, passengerValue, idleWeight, emergency });
export const VEHICLE_CLASSES: Record<VehicleType, VehicleClassConfig> = {
  compact: define("compact", "Compact", 18, 10, 73, 28, 49, 10, "car", 2, .8),
  sedan: define("sedan", "Sedan", 22, 11, 72, 24, 46, 12, "car", 3),
  suv: define("suv", "SUV", 26, 12, 69, 21, 43, 14, "car", 4, 1.2),
  van: define("van", "Van", 29, 12, 66, 18, 39, 16, "van", 3, 1.3),
  truck: define("truck", "Delivery truck", 38, 13, 61, 13, 32, 20, "truck", 1, 2),
  bus: define("bus", "City bus", 48, 13, 60, 12, 30, 22, "bus", 32, 2.4),
  motorcycle: define("motorcycle", "Motorcycle", 12, 5, 77, 34, 51, 8, "motorcycle", 1, .4),
  police: define("police", "Police", 23, 11, 78, 28, 48, 12, "police", 2, 1, true),
  ambulance: define("ambulance", "Ambulance", 31, 12, 73, 22, 42, 16, "ambulance", 3, 1.4, true),
  fire: define("fire", "Fire engine", 42, 13, 65, 15, 34, 20, "fire", 5, 2.2, true),
};
export const DEFAULT_SETTINGS: SimulationSettings = {
  nsGreen: 18, ewGreen: 18, demand: 1, demandMode: "auto",
  directionalDemand: { north: 1, south: 1, east: 1, west: 1 },
  vehicleMix: { heavy: 12, motorcycle: 6, emergency: 1, normal: "balanced" },
  emergencyPriority: true, randomIncidents: true, showCongestion: false,
};
export function normalizeMix(mix: VehicleMix): VehicleMix {
  const next = { ...mix, heavy: Math.max(0, Math.min(80, mix.heavy)), motorcycle: Math.max(0, Math.min(80, mix.motorcycle)), emergency: Math.max(0, Math.min(20, mix.emergency)) };
  const total = next.heavy + next.motorcycle + next.emergency;
  if (total > 90) { next.heavy *= 90 / total; next.motorcycle *= 90 / total; next.emergency *= 90 / total; }
  return next;
}
export function chooseVehicleType(state: SimulationState): VehicleType {
  const mix = state.settings.vehicleMix;
  const roll = random(state) * 100;
  if (roll < mix.emergency) return (["police", "ambulance", "fire"] as const)[Math.floor(random(state) * 3)];
  if (roll < mix.emergency + mix.motorcycle) return "motorcycle";
  if (roll < mix.emergency + mix.motorcycle + mix.heavy) return random(state) < .6 ? "truck" : "bus";
  const choices: VehicleType[] = mix.normal === "commuter" ? ["compact", "compact", "sedan", "suv"] : mix.normal === "commercial" ? ["van", "van", "sedan", "suv"] : ["compact", "sedan", "sedan", "suv", "van"];
  return choices[Math.floor(random(state) * choices.length)];
}
export function makeVehicle(state: SimulationState, laneId: number, position: number, type: VehicleType = chooseVehicleType(state)): Vehicle {
  const config = VEHICLE_CLASSES[type];
  const colors = ["#d9dcd5", "#7e939c", "#c6bfb0", "#536b72", "#ad6657", "#c2aa70", "#566877", "#a5b6b0"];
  return {
    id: state.nextId++, type, laneId, position, previousPosition: position,
    speed: config.maxSpeed * state.environment.modifiers.speed,
    length: config.length, width: config.width, color: colors[Math.floor(random(state) * colors.length)],
    waitTime: 0, braking: false, committed: false, passed: false,
    emergency: config.emergency, priority: false, responseId: null, incidentId: null,
  };
}
