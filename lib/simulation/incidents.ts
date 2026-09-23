import { emitEvent } from "./events";
import { LANES, WORLD_EDGE } from "./lanes";
import { makeVehicle } from "./vehicles";
import type {
  Direction,
  EmergencyResponse,
  EmergencyType,
  ImplementedIncidentKind,
  Incident,
  SimulationState,
} from "./types";

const DIRECTIONS: Direction[] = ["north", "south", "east", "west"];

function directionLabel(direction: Direction) {
  return direction.charAt(0).toUpperCase() + direction.slice(1);
}

function chooseLane(state: SimulationState, direction?: Direction) {
  const targetDirection = direction ?? DIRECTIONS[state.incidentSeed % DIRECTIONS.length];
  const candidates = LANES.filter((lane) => lane.origin === targetDirection);
  const lane = candidates[state.incidentSeed % candidates.length];
  state.incidentSeed = (Math.imul(1664525, state.incidentSeed) + 1013904223) >>> 0;
  return lane;
}

function chooseIncidentVehicle(state: SimulationState, laneId: number) {
  return state.vehicles
    .filter((vehicle) => vehicle.laneId === laneId && vehicle.position > -280 && vehicle.position < -135 && vehicle.incidentId === null)
    .sort((a, b) => Math.abs(a.position + 175) - Math.abs(b.position + 175))[0];
}

export function triggerIncident(
  state: SimulationState,
  kind: ImplementedIncidentKind,
  direction?: Direction,
  duration?: number,
  multiplier = 1.6,
): Incident {
  const id = state.nextIncidentId++;

  if (kind === "surge") {
    const chosenDirection = direction ?? DIRECTIONS[id % DIRECTIONS.length];
    const incident: Incident = {
      id,
      kind,
      laneId: null,
      position: 0,
      vehicleIds: [],
      startedAt: state.time,
      blockedAt: null,
      duration: duration ?? 75,
      remaining: duration ?? 75,
      status: "active",
      clearedAt: null,
      directions: [chosenDirection],
      demandMultiplier: multiplier,
      responseId: null,
    };
    state.incidents.push(incident);
    emitEvent(state, {
      kind: "surge",
      title: "TRAFFIC SURGE",
      detail: `+${Math.round((multiplier - 1) * 100)}% ${chosenDirection}bound demand for ${Math.round(incident.duration)}s`,
      incidentId: id,
    });
    return incident;
  }

  const lane = chooseLane(state, direction);
  let primary = chooseIncidentVehicle(state, lane.id);
  if (!primary) {
    primary = makeVehicle(state, lane.id, -175, kind === "breakdown" ? "van" : "sedan");
    state.vehicles.push(primary);
  }

  const incidentDuration = duration ?? (kind === "collision" ? 52 : 42);
  const incident: Incident = {
    id,
    kind,
    laneId: lane.id,
    position: primary.position,
    vehicleIds: [primary.id],
    startedAt: state.time,
    blockedAt: state.time,
    duration: incidentDuration,
    remaining: incidentDuration,
    status: "active",
    clearedAt: null,
    directions: [lane.origin],
    demandMultiplier: 1,
    responseId: null,
  };

  primary.incidentId = id;
  primary.speed = 0;
  primary.braking = true;

  if (kind === "collision") {
    const secondary = state.vehicles
      .filter((vehicle) => vehicle.laneId === lane.id && vehicle.id !== primary!.id && vehicle.incidentId === null)
      .sort((a, b) => Math.abs(a.position - (primary!.position - primary!.length - 8)) - Math.abs(b.position - (primary!.position - primary!.length - 8)))[0];
    if (secondary) {
      secondary.incidentId = id;
      secondary.speed = 0;
      secondary.braking = true;
      incident.vehicleIds.push(secondary.id);
    }
  }

  state.incidents.push(incident);
  emitEvent(state, {
    kind: "incident",
    title: kind === "collision" ? "MINOR COLLISION" : "VEHICLE BREAKDOWN",
    detail: `${directionLabel(lane.origin)} Avenue lane blocked · clearance ~${Math.round(incidentDuration)}s`,
    incidentId: id,
  });
  return incident;
}

export function dispatchEmergency(
  state: SimulationState,
  type: EmergencyType = "ambulance",
  incidentId: number | null = null,
  origin?: Direction,
): EmergencyResponse {
  const incident = incidentId === null ? null : state.incidents.find((item) => item.id === incidentId) ?? null;
  const targetOrigin = origin ?? incident?.directions[0] ?? DIRECTIONS[state.nextResponseId % DIRECTIONS.length];
  const originLanes = LANES.filter((item) => item.origin === targetOrigin);
  const lane = incident?.laneId !== null && incident?.laneId !== undefined
    ? originLanes.find((item) => item.id !== incident.laneId) ?? originLanes[0] ?? LANES[0]
    : originLanes[0] ?? LANES[0];
  const responseId = state.nextResponseId++;
  const targetPosition = incident?.position ?? 70;
  const vehicle = makeVehicle(state, lane.id, -WORLD_EDGE, type);
  vehicle.responseId = responseId;
  vehicle.priority = true;
  state.vehicles.push(vehicle);

  const response: EmergencyResponse = {
    id: responseId,
    type,
    origin: targetOrigin,
    laneId: lane.id,
    incidentId,
    vehicleId: vehicle.id,
    requestedAt: state.time,
    spawnedAt: state.time,
    arrivedAt: null,
    status: "approaching",
    serviceUntil: null,
    targetPosition,
  };

  state.responses.push(response);
  if (incident) incident.responseId = responseId;
  if (state.settings.emergencyPriority) state.lights.priorityAxis = lane.axis;

  emitEvent(state, {
    kind: "emergency",
    title: "EMERGENCY RESPONSE",
    detail: `${type === "fire" ? "Fire engine" : type.charAt(0).toUpperCase() + type.slice(1)} approaching from ${directionLabel(targetOrigin)} Avenue`,
    responseId,
    incidentId: incidentId ?? undefined,
  });

  return response;
}

export function demandMultiplierForDirection(state: SimulationState, direction: Direction) {
  return state.incidents
    .filter((incident) => incident.kind === "surge" && incident.status === "active" && incident.directions.includes(direction))
    .reduce((value, incident) => value * incident.demandMultiplier, 1);
}

export function activeBlockPosition(state: SimulationState, laneId: number): number | null {
  let nearest: number | null = null;
  for (const incident of state.incidents) {
    if (incident.status !== "active" || incident.laneId !== laneId || incident.kind === "surge") continue;
    if (nearest === null || incident.position < nearest) nearest = incident.position;
  }
  return nearest;
}

export function updateIncidents(state: SimulationState, dt: number) {
  for (const incident of state.incidents) {
    if (incident.status !== "active") continue;
    incident.remaining = Math.max(0, incident.remaining - dt);
    if (incident.remaining > 0) continue;

    incident.status = "cleared";
    incident.clearedAt = state.time;
    for (const vehicleId of incident.vehicleIds) {
      const vehicle = state.vehicles.find((item) => item.id === vehicleId);
      if (vehicle && vehicle.incidentId === incident.id) {
        vehicle.incidentId = null;
        vehicle.braking = false;
      }
    }
    emitEvent(state, {
      kind: "clearance",
      title: "LANE REOPENED",
      detail: `${incident.directions[0] ? directionLabel(incident.directions[0]) + " Avenue" : "Affected lane"} is moving again`,
      incidentId: incident.id,
    });
  }

  state.incidents = state.incidents.filter(
    (incident) => incident.status !== "cleared" || state.time - (incident.clearedAt ?? state.time) < 12,
  );
}

export function updateEmergencyResponses(state: SimulationState) {
  for (const response of state.responses) {
    const vehicle = state.vehicles.find((item) => item.id === response.vehicleId);
    if (!vehicle) {
      if (response.status !== "complete") response.status = "complete";
      continue;
    }

    if (response.status === "approaching" && vehicle.position >= Math.min(response.targetPosition - 32, 55)) {
      response.status = "on-scene";
      response.arrivedAt = state.time;
      response.serviceUntil = state.time + 8;
      vehicle.priority = false;
      emitEvent(state, {
        kind: "arrival",
        title: "RESPONSE ON SCENE",
        detail: `Emergency unit arrived in ${Math.max(0, state.time - response.requestedAt).toFixed(1)}s`,
        responseId: response.id,
        incidentId: response.incidentId ?? undefined,
      });
    }

    if (response.status === "on-scene" && response.serviceUntil !== null && state.time >= response.serviceUntil) {
      response.status = "complete";
    }
  }

  const activePriority = state.responses.find((response) => response.status === "approaching");
  state.lights.priorityAxis = activePriority ? LANES[activePriority.laneId].axis : null;
}

export function clearIncidentEarly(state: SimulationState, incidentId: number, seconds = 18) {
  const incident = state.incidents.find((item) => item.id === incidentId && item.status === "active");
  if (!incident) return false;
  incident.remaining = Math.max(2, incident.remaining - seconds);
  emitEvent(state, {
    kind: "intervention",
    title: "CLEARANCE CREW",
    detail: `Incident clearance accelerated by ${seconds}s`,
    incidentId,
  });
  return true;
}
