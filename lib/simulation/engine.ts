import { createEnvironment, stepEnvironment } from "./environment";
import { getChallenge } from "./challenges";
import { emitEvent } from "./events";
import {
  activeBlockPosition,
  clearIncidentEarly,
  demandMultiplierForDirection,
  dispatchEmergency,
  triggerIncident,
  updateEmergencyResponses,
  updateIncidents,
} from "./incidents";
import { CLEAR_POSITION, LANES, STOP_POSITION, WORLD_EDGE, vehiclePoint } from "./lanes";
import { scoreChallenge } from "./scoring";
import { DEFAULT_SETTINGS as VEHICLE_DEFAULT_SETTINGS, VEHICLE_CLASSES, makeVehicle } from "./vehicles";
import type {
  Axis,
  Direction,
  EmergencyType,
  ImplementedIncidentKind,
  Metrics,
  SignalColor,
  SignalPhase,
  SimulationSettings,
  SimulationSnapshot,
  SimulationState,
  TimeOfDay,
  Vehicle,
  WeatherMode,
} from "./types";

export { LANES, STOP_POSITION, CLEAR_POSITION, WORLD_EDGE, vehiclePoint };

export const FIXED_STEP = 1 / 60;
export const DEFAULT_SETTINGS: SimulationSettings = VEHICLE_DEFAULT_SETTINGS;
const PHASES: SignalPhase[] = ["ns-green", "ns-amber", "ns-clear", "ew-green", "ew-amber", "ew-clear"];

function mergeSettings(settings: Partial<SimulationSettings> = {}): SimulationSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    directionalDemand: {
      ...DEFAULT_SETTINGS.directionalDemand,
      ...(settings.directionalDemand ?? {}),
    },
    vehicleMix: {
      ...DEFAULT_SETTINGS.vehicleMix,
      ...(settings.vehicleMix ?? {}),
    },
  };
}

export function createSimulation(settings: Partial<SimulationSettings> = {}): SimulationState {
  const merged = mergeSettings(settings);
  const state: SimulationState = {
    time: 0,
    mode: "sandbox",
    vehicles: [],
    lights: { phase: "ns-green", elapsed: 0, priorityAxis: null },
    settings: merged,
    environment: createEnvironment("clear", "night"),
    spawnTimers: LANES.map((lane) => 0.3 + lane.id * 0.29),
    nextId: 1,
    randomSeed: 2048,
    incidentSeed: 99173,
    passed: 0,
    completedWait: 0,
    recentPasses: [],
    maxQueue: 0,
    totalIdleTime: 0,
    weightedIdleTime: 0,
    passengerThroughput: 0,
    passedByType: {
      compact: 0, sedan: 0, suv: 0, van: 0, truck: 0,
      bus: 0, motorcycle: 0, police: 0, ambulance: 0, fire: 0,
    },
    incidents: [],
    responses: [],
    events: [],
    nextEventId: 1,
    nextIncidentId: 1,
    nextResponseId: 1,
    nextRandomIncidentAt: 48,
    priority: null,
    challenge: null,
  };

  for (const lane of LANES) {
    for (let i = 0; i < 4; i++) {
      const position = -190 - i * 115 - ((lane.id * 37 + i * 53) % 38);
      const vehicle = makeVehicle(state, lane.id, position);
      const config = VEHICLE_CLASSES[vehicle.type];
      if (lane.axis === "ew") {
        vehicle.speed = Math.min(
          vehicle.speed,
          Math.sqrt(2 * config.deceleration * Math.max(0, STOP_POSITION - position)),
        );
      }
      state.vehicles.push(vehicle);
    }
  }
  return state;
}

export function createChallengeSimulation(challengeId: string): SimulationState {
  const challenge = getChallenge(challengeId);
  const state = createSimulation(challenge.settings);
  state.mode = "challenge";
  state.environment = createEnvironment(challenge.weather, challenge.timeOfDay);
  state.challenge = {
    id: challenge.id,
    status: "running",
    budget: challenge.budget,
    initialBudget: challenge.budget,
    firedEvents: [],
    result: null,
  };
  state.events = [];
  emitEvent(state, {
    kind: "challenge",
    title: challenge.title,
    detail: `${challenge.timestamp} · Simulation started`,
  });
  return state;
}

export function signalFor(state: SimulationState, axis: Axis): SignalColor {
  if (state.lights.phase === `${axis}-green`) return "green";
  if (state.lights.phase === `${axis}-amber`) return "amber";
  return "red";
}

function requestedPriorityAxis(state: SimulationState): Axis | null {
  if (state.priority && state.time < state.priority.until) return state.priority.axis;
  const response = state.responses.find((item) => item.status === "approaching");
  return response ? LANES[response.laneId].axis : null;
}

export function phaseDuration(state: SimulationState): number {
  if (state.lights.phase === "ns-green") return state.settings.nsGreen;
  if (state.lights.phase === "ew-green") return state.settings.ewGreen;
  return state.lights.phase.endsWith("amber") ? 3 : 1.5;
}

function updateSignals(state: SimulationState, dt: number) {
  state.lights.elapsed += dt;
  const priorityAxis = requestedPriorityAxis(state);
  state.lights.priorityAxis = priorityAxis;

  if (priorityAxis) {
    const activeAxis = state.lights.phase.startsWith("ns") ? "ns" : "ew";
    if (
      state.lights.phase.endsWith("green") &&
      activeAxis !== priorityAxis &&
      state.lights.elapsed >= 3
    ) {
      state.lights.phase = `${activeAxis}-amber` as SignalPhase;
      state.lights.elapsed = 0;
      return;
    }
  }

  if (state.lights.elapsed < phaseDuration(state)) return;

  if (
    state.lights.phase.endsWith("clear") &&
    state.vehicles.some((vehicle) => vehicle.committed && vehicle.position < CLEAR_POSITION)
  ) return;

  if (state.lights.phase.endsWith("clear") && priorityAxis) {
    state.lights.phase = `${priorityAxis}-green` as SignalPhase;
    state.lights.elapsed = 0;
    return;
  }

  const oldPhase = state.lights.phase;
  state.lights.phase = PHASES[(PHASES.indexOf(oldPhase) + 1) % PHASES.length];
  state.lights.elapsed = 0;

  if (state.lights.phase.endsWith("amber")) {
    const axis = state.lights.phase.startsWith("ns") ? "ns" : "ew";
    for (const vehicle of state.vehicles) {
      if (LANES[vehicle.laneId].axis !== axis || vehicle.position >= STOP_POSITION) continue;
      const config = VEHICLE_CLASSES[vehicle.type];
      const deceleration = config.deceleration / state.environment.modifiers.brakingDistance;
      const stoppingDistance = vehicle.speed ** 2 / (2 * Math.max(1, deceleration)) + 3;
      if (STOP_POSITION - vehicle.position < stoppingDistance) vehicle.committed = true;
    }
  }
}

function isVehicleHeldByIncident(state: SimulationState, vehicle: Vehicle) {
  return vehicle.incidentId !== null && state.incidents.some(
    (incident) => incident.id === vehicle.incidentId && incident.status === "active",
  );
}

function updateChallenge(state: SimulationState) {
  if (!state.challenge || state.challenge.status !== "running") return;
  const challenge = getChallenge(state.challenge.id);

  challenge.events.forEach((event, index) => {
    if (state.challenge!.firedEvents.includes(index) || state.time < event.at) return;
    state.challenge!.firedEvents.push(index);
    const incident = triggerIncident(
      state,
      event.kind,
      event.direction,
      event.duration,
      event.multiplier ?? 1.6,
    );
    if (event.response) dispatchEmergency(state, event.response, incident.id, event.direction);
  });

  if (state.time >= challenge.duration) {
    state.challenge.status = "finished";
    state.challenge.result = scoreChallenge(
      challenge,
      getMetrics(state),
      state.challenge.budget,
      state.challenge.initialBudget,
    );
    emitEvent(state, {
      kind: "challenge",
      title: state.challenge.result.success ? "OBJECTIVE COMPLETE" : "RUN COMPLETE",
      detail: `Traflux score ${state.challenge.result.score.overall}`,
    });
  }
}

function maybeTriggerRandomIncident(state: SimulationState) {
  if (!state.settings.randomIncidents || state.mode !== "sandbox" || state.time < state.nextRandomIncidentAt) return;
  const kinds: ImplementedIncidentKind[] = ["breakdown", "surge", "collision"];
  const directions: Direction[] = ["north", "south", "east", "west"];
  const kind = kinds[state.incidentSeed % kinds.length];
  const direction = directions[(state.incidentSeed >>> 3) % directions.length];
  const incident = triggerIncident(state, kind, direction);
  if (kind === "collision") dispatchEmergency(state, "ambulance", incident.id, direction);
  state.incidentSeed = (Math.imul(1664525, state.incidentSeed) + 1013904223) >>> 0;
  state.nextRandomIncidentAt = state.time + 55 + (state.incidentSeed % 45);
}

/** Mutates only the supplied state. Call with FIXED_STEP for reproducible runs. */
export function stepSimulation(state: SimulationState, dt: number = FIXED_STEP): void {
  state.time += dt;
  stepEnvironment(state.environment, dt);
  updateIncidents(state, dt);
  updateEmergencyResponses(state);
  updateSignals(state, dt);
  maybeTriggerRandomIncident(state);
  updateChallenge(state);

  for (const lane of LANES) {
    const cars = state.vehicles
      .filter((vehicle) => vehicle.laneId === lane.id)
      .sort((a, b) => b.position - a.position);

    let leader: Vehicle | undefined;
    const laneBlock = activeBlockPosition(state, lane.id);

    for (const car of cars) {
      const config = VEHICLE_CLASSES[car.type];
      car.previousPosition = car.position;

      if (isVehicleHeldByIncident(state, car)) {
        car.speed = 0;
        car.braking = true;
        leader = car;
        continue;
      }

      const speedLimit = config.maxSpeed * state.environment.modifiers.speed;
      const deceleration = config.deceleration / state.environment.modifiers.brakingDistance;
      const acceleration = config.acceleration;
      const desiredGap =
        config.followingGap *
        state.environment.modifiers.followingDistance /
        Math.max(0.45, state.environment.modifiers.roadCapacity);

      let limit = Infinity;
      let targetSpeed = speedLimit;

      if (leader) {
        const leaderConfig = VEHICLE_CLASSES[leader.type];
        const sharedGap = Math.max(
          desiredGap,
          leaderConfig.followingGap * state.environment.modifiers.followingDistance,
        );
        limit = leader.position - (leader.length + car.length) / 2 - sharedGap;
        const distance = Math.max(0, limit - car.position);
        targetSpeed = Math.min(
          targetSpeed,
          Math.sqrt(Math.max(0, leader.speed ** 2 + 2 * deceleration * distance)),
          distance / 0.65,
        );
      }

      if (laneBlock !== null && car.position < laneBlock) {
        const blockLimit = laneBlock - car.length / 2 - desiredGap;
        limit = Math.min(limit, blockLimit);
        targetSpeed = Math.min(
          targetSpeed,
          Math.sqrt(2 * deceleration * Math.max(0, blockLimit - car.position)),
        );
      }

      if (!car.committed && car.position <= STOP_POSITION && signalFor(state, lane.axis) !== "green") {
        limit = Math.min(limit, STOP_POSITION);
        targetSpeed = Math.min(
          targetSpeed,
          Math.sqrt(2 * deceleration * Math.max(0, STOP_POSITION - car.position)),
        );
      }

      const oldSpeed = car.speed;
      car.speed = Math.max(
        0,
        Math.min(
          oldSpeed + acceleration * dt,
          Math.max(targetSpeed, oldSpeed - deceleration * dt),
        ),
      );

      const nextPosition = Math.max(car.position, Math.min(limit, car.position + car.speed * dt));
      car.speed = Math.max(0, (nextPosition - car.position) / dt);
      car.position = nextPosition;
      car.braking = car.speed < oldSpeed - 0.1 || car.speed < 2;

      if (car.position > STOP_POSITION) car.committed = true;
      if (car.speed < 2 && car.position <= STOP_POSITION) {
        car.waitTime += dt;
        state.totalIdleTime += dt;
        state.weightedIdleTime += dt * config.idleWeight;
      }

      if (!car.passed && car.position > CLEAR_POSITION) {
        car.passed = true;
        state.passed++;
        state.completedWait += car.waitTime;
        state.recentPasses.push(state.time);
        state.passengerThroughput += config.passengerValue;
        state.passedByType[car.type]++;
      }

      leader = car;
    }

    const timeDemand = state.settings.demandMode === "auto" ? state.environment.automaticDemand : 1;
    const effectiveDemand =
      state.settings.demand *
      state.settings.directionalDemand[lane.origin] *
      timeDemand *
      state.environment.modifiers.demand *
      demandMultiplierForDirection(state, lane.origin);

    state.spawnTimers[lane.id] -= dt * Math.max(0.05, effectiveDemand);

    if (state.spawnTimers[lane.id] <= 0) {
      const last = cars[cars.length - 1];
      const minimumEntryGap = 52 / Math.max(0.55, state.environment.modifiers.roadCapacity);
      if (!last || last.position > -WORLD_EDGE + minimumEntryGap) {
        const car = makeVehicle(state, lane.id, -WORLD_EDGE);
        if (last) car.speed = Math.min(car.speed, last.speed);
        state.vehicles.push(car);
        state.spawnTimers[lane.id] =
          (2.7 + ((lane.id * 17 + state.nextId * 13) % 14) / 10) /
          Math.max(0.45, state.environment.modifiers.roadCapacity);
      }
    }
  }

  state.vehicles = state.vehicles.filter((vehicle) => vehicle.position < WORLD_EDGE);
  state.recentPasses = state.recentPasses.filter((time) => time > state.time - 60);

  const currentQueue = state.vehicles.filter(
    (vehicle) => vehicle.speed < 2 && vehicle.position <= STOP_POSITION,
  ).length;
  state.maxQueue = Math.max(state.maxQueue, currentQueue);

  if (state.priority && state.time >= state.priority.until) state.priority = null;
}

export function setWeather(state: SimulationState, weather: WeatherMode) {
  if (state.environment.weather === weather) return;
  state.environment.weather = weather;
  emitEvent(state, { kind: "environment", title: "WEATHER UPDATED", detail: weather.toUpperCase() });
}

export function setTimeOfDay(state: SimulationState, timeOfDay: TimeOfDay) {
  if (state.environment.timeOfDay === timeOfDay) return;
  state.environment.timeOfDay = timeOfDay;
  emitEvent(state, { kind: "environment", title: "TIME UPDATED", detail: timeOfDay.toUpperCase() });
}

export function triggerSandboxIncident(
  state: SimulationState,
  kind: ImplementedIncidentKind,
  direction?: Direction,
) {
  const incident = triggerIncident(state, kind, direction);
  if (kind === "collision") dispatchEmergency(state, "ambulance", incident.id, direction);
  return incident;
}

export function triggerEmergency(
  state: SimulationState,
  type: EmergencyType = "ambulance",
  origin?: Direction,
) {
  return dispatchEmergency(state, type, null, origin);
}

export function applyGreenPriority(state: SimulationState, axis: Axis) {
  const cost = state.mode === "challenge" ? 2000 : 0;
  if (state.challenge && state.challenge.budget < cost) return false;
  if (state.challenge) state.challenge.budget -= cost;
  state.priority = { axis, until: state.time + 14 };
  state.lights.priorityAxis = axis;
  emitEvent(state, {
    kind: "intervention",
    title: "GREEN PRIORITY",
    detail: `${axis === "ns" ? "North / South" : "East / West"} priority · 14s${cost ? ` · $${cost.toLocaleString()}` : ""}`,
  });
  return true;
}

export function accelerateIncidentClearance(state: SimulationState, incidentId: number) {
  const cost = state.mode === "challenge" ? 8000 : 0;
  if (state.challenge && state.challenge.budget < cost) return false;
  const changed = clearIncidentEarly(state, incidentId, 20);
  if (!changed) return false;
  if (state.challenge) state.challenge.budget -= cost;
  return true;
}

export function getMetrics(state: SimulationState): Metrics {
  let queue = 0;
  let nsQueue = 0;
  let ewQueue = 0;
  let waiting = 0;
  let unfinishedWait = 0;
  const laneQueues = LANES.map(() => 0);

  for (const vehicle of state.vehicles) {
    if (!vehicle.passed) {
      unfinishedWait += vehicle.waitTime;
      waiting++;
    }
    if (vehicle.speed < 2 && vehicle.position <= STOP_POSITION) {
      queue++;
      laneQueues[vehicle.laneId]++;
      if (LANES[vehicle.laneId].axis === "ns") nsQueue++;
      else ewQueue++;
    }
  }

  const completedResponses = state.responses
    .filter((response) => response.arrivedAt !== null)
    .map((response) => (response.arrivedAt ?? 0) - response.requestedAt);
  const emergencyResponseTime = completedResponses.length
    ? completedResponses.reduce((sum, value) => sum + value, 0) / completedResponses.length
    : null;

  return {
    active: state.vehicles.length,
    queue,
    nsQueue,
    ewQueue,
    passed: state.passed,
    averageWait: (state.completedWait + unfinishedWait) / Math.max(1, state.passed + waiting),
    throughput: state.recentPasses.length * 60 / Math.max(1, Math.min(60, state.time)),
    maxQueue: state.maxQueue,
    totalIdleTime: state.totalIdleTime,
    weightedIdleTime: state.weightedIdleTime,
    passengerThroughput: state.passengerThroughput,
    emergencyResponseTime,
    pendingResponses: state.responses.filter((response) => response.status !== "complete").length,
    laneQueues,
    passedByType: { ...state.passedByType },
  };
}

export function getSnapshot(state: SimulationState): SimulationSnapshot {
  const duration = phaseDuration(state);
  return {
    time: state.time,
    phase: state.lights.phase,
    nsSignal: signalFor(state, "ns"),
    ewSignal: signalFor(state, "ew"),
    remaining: Math.max(0, duration - state.lights.elapsed),
    progress: Math.min(1, state.lights.elapsed / duration),
    metrics: getMetrics(state),
    environment: {
      ...state.environment,
      modifiers: { ...state.environment.modifiers },
      visuals: { ...state.environment.visuals },
    },
    incidents: state.incidents.map((incident) => ({ ...incident, directions: [...incident.directions] })),
    responses: state.responses.map((response) => ({ ...response })),
    events: state.events.map((event) => ({ ...event })),
    priorityAxis: state.lights.priorityAxis,
    priority: state.priority ? { ...state.priority } : null,
    challenge: state.challenge
      ? {
          ...state.challenge,
          firedEvents: [...state.challenge.firedEvents],
          result: state.challenge.result
            ? {
                ...state.challenge.result,
                score: { ...state.challenge.result.score },
                objectives: state.challenge.result.objectives.map((objective) => ({ ...objective })),
                metrics: {
                  ...state.challenge.result.metrics,
                  laneQueues: [...state.challenge.result.metrics.laneQueues],
                  passedByType: { ...state.challenge.result.metrics.passedByType },
                },
              }
            : null,
        }
      : null,
  };
}
