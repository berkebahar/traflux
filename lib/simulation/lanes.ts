import type { Intersection, Lane, Vehicle } from "./types";

export const WORLD_EDGE = 660;
export const STOP_POSITION = -124;
export const CLEAR_POSITION = 96;
export const LANES: Lane[] = [
  { id: 0, origin: "north", axis: "ns", offset: 20, angle: Math.PI / 2 },
  { id: 1, origin: "north", axis: "ns", offset: 48, angle: Math.PI / 2 },
  { id: 2, origin: "south", axis: "ns", offset: 20, angle: -Math.PI / 2 },
  { id: 3, origin: "south", axis: "ns", offset: 48, angle: -Math.PI / 2 },
  { id: 4, origin: "east", axis: "ew", offset: 20, angle: Math.PI },
  { id: 5, origin: "east", axis: "ew", offset: 48, angle: Math.PI },
  { id: 6, origin: "west", axis: "ew", offset: 20, angle: 0 },
  { id: 7, origin: "west", axis: "ew", offset: 48, angle: 0 },
];
export const INTERSECTION: Intersection = { id: "north-east-01", lanes: LANES, roadHalfWidth: 78, stopLine: -111, clearanceEdge: 88, worldEdge: WORLD_EDGE };
export function stopPosition(vehicle: Vehicle): number { return INTERSECTION.stopLine - vehicle.length / 2 - 2; }
export function hasCleared(vehicle: Vehicle): boolean { return vehicle.position - vehicle.length / 2 > INTERSECTION.clearanceEdge; }
export function vehiclePoint(lane: Lane, position: number): { x: number; y: number } {
  return { x: Math.cos(lane.angle) * position - Math.sin(lane.angle) * lane.offset, y: Math.sin(lane.angle) * position + Math.cos(lane.angle) * lane.offset };
}
