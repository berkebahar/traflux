import type { Axis, Lane, Metrics, SignalColor, SignalPhase, SimulationSettings, SimulationSnapshot, SimulationState, Vehicle, WeatherModifiers } from "./types";

export const FIXED_STEP = 1 / 60;
export const WORLD_EDGE = 660;
export const STOP_POSITION = -124;
export const CLEAR_POSITION = 96;
export const DEFAULT_SETTINGS: SimulationSettings = { nsGreen: 18, ewGreen: 18, demand: 1 };
export const CLEAR_NIGHT: WeatherModifiers = { speed: 1, brakingDistance: 1, roadCapacity: 1, demand: 1 };
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
const COLORS = ["#d9dcd5", "#7e939c", "#c6bfb0", "#536b72", "#ad6657", "#c2aa70", "#566877", "#a5b6b0"];
const PHASES: SignalPhase[] = ["ns-green", "ns-amber", "ns-clear", "ew-green", "ew-amber", "ew-clear"];
const MAX_SPEED = 72;
const ACCELERATION = 24;
const BRAKING = 46;
const GAP = 12;

function random(state: SimulationState): number {
  state.randomSeed = (Math.imul(1664525, state.randomSeed) + 1013904223) >>> 0;
  return state.randomSeed / 4294967296;
}

function makeVehicle(state: SimulationState, laneId: number, position: number): Vehicle {
  return {
    id: state.nextId++, laneId, position, previousPosition: position,
    speed: MAX_SPEED * state.weather.speed, length: random(state) > 0.82 ? 25 : 21,
    color: COLORS[Math.floor(random(state) * COLORS.length)], waitTime: 0,
    braking: false, committed: false, passed: false,
  };
}

export function createSimulation(settings: SimulationSettings = DEFAULT_SETTINGS): SimulationState {
  const state: SimulationState = {
    time: 0, vehicles: [], lights: { phase: "ns-green", elapsed: 0 },
    settings: { ...settings }, weather: { ...CLEAR_NIGHT },
    spawnTimers: LANES.map((lane) => 0.3 + lane.id * 0.29),
    nextId: 1, randomSeed: 2048, passed: 0, completedWait: 0, recentPasses: [],
  };
  // Seed approaching traffic so the scene is alive from the first frame.
  for (const lane of LANES) {
    for (let i = 0; i < 4; i++) {
      const position = -190 - i * 115 - random(state) * 38;
      const vehicle = makeVehicle(state, lane.id, position);
      if (lane.axis === "ew") vehicle.speed = Math.min(vehicle.speed, Math.sqrt(2 * BRAKING * (STOP_POSITION - position)));
      state.vehicles.push(vehicle);
    }
  }
  return state;
}

export function signalFor(state: SimulationState, axis: Axis): SignalColor {
  if (state.lights.phase === `${axis}-green`) return "green";
  if (state.lights.phase === `${axis}-amber`) return "amber";
  return "red";
}

export function phaseDuration(state: SimulationState): number {
  if (state.lights.phase === "ns-green") return state.settings.nsGreen;
  if (state.lights.phase === "ew-green") return state.settings.ewGreen;
  return state.lights.phase.endsWith("amber") ? 3 : 1.5;
}

function updateSignals(state: SimulationState, dt: number) {
  state.lights.elapsed += dt;
  if (state.lights.elapsed < phaseDuration(state)) return;
  // All-red extends until the last committed vehicle has cleared the conflict area.
  if (state.lights.phase.endsWith("clear") && state.vehicles.some((v) => v.committed && v.position < CLEAR_POSITION)) return;
  const oldPhase = state.lights.phase;
  state.lights.phase = PHASES[(PHASES.indexOf(oldPhase) + 1) % PHASES.length];
  state.lights.elapsed = 0;
  if (state.lights.phase.endsWith("amber")) {
    const axis = state.lights.phase.startsWith("ns") ? "ns" : "ew";
    const deceleration = BRAKING / state.weather.brakingDistance;
    for (const v of state.vehicles) {
      // Vehicles too close to stop comfortably finish crossing during clearance.
      if (LANES[v.laneId].axis === axis && v.position < STOP_POSITION && STOP_POSITION - v.position < v.speed ** 2 / (2 * deceleration) + 3) v.committed = true;
    }
  }
}

/** Mutates only the supplied state. Call with FIXED_STEP for reproducible runs. */
export function stepSimulation(state: SimulationState, dt: number = FIXED_STEP): void {
  state.time += dt;
  updateSignals(state, dt);
  const speedLimit = MAX_SPEED * state.weather.speed;
  const deceleration = BRAKING / state.weather.brakingDistance;
  const gap = GAP / state.weather.roadCapacity;

  for (const lane of LANES) {
    const cars = state.vehicles.filter((v) => v.laneId === lane.id).sort((a, b) => b.position - a.position);
    let leader: Vehicle | undefined;
    for (const car of cars) {
      car.previousPosition = car.position;
      let limit = Infinity;
      let targetSpeed = speedLimit;
      if (leader) {
        limit = leader.position - (leader.length + car.length) / 2 - gap;
        const distance = Math.max(0, limit - car.position);
        targetSpeed = Math.min(targetSpeed, Math.sqrt(leader.speed ** 2 + 2 * deceleration * distance), distance / 0.65);
      }
      if (!car.committed && car.position <= STOP_POSITION && signalFor(state, lane.axis) !== "green") {
        limit = Math.min(limit, STOP_POSITION);
        targetSpeed = Math.min(targetSpeed, Math.sqrt(2 * deceleration * Math.max(0, STOP_POSITION - car.position)));
      }
      const oldSpeed = car.speed;
      car.speed = Math.max(0, Math.min(oldSpeed + ACCELERATION * dt, Math.max(targetSpeed, oldSpeed - deceleration * dt)));
      // A future capacity change may increase the desired gap instantly. Hold
      // position until it opens; never move a vehicle backwards to create space.
      const nextPosition = Math.max(car.position, Math.min(limit, car.position + car.speed * dt));
      car.speed = Math.max(0, (nextPosition - car.position) / dt);
      car.position = nextPosition;
      car.braking = car.speed < oldSpeed - 0.1 || car.speed < 2;
      if (car.position > STOP_POSITION) car.committed = true;
      if (car.speed < 2 && car.position <= STOP_POSITION) car.waitTime += dt;
      if (!car.passed && car.position > CLEAR_POSITION) {
        car.passed = true;
        state.passed++;
        state.completedWait += car.waitTime;
        state.recentPasses.push(state.time);
      }
      leader = car;
    }
    // Demand changes affect the next arrival immediately; blocked entries never overlap.
    state.spawnTimers[lane.id] -= dt * state.settings.demand * state.weather.demand;
    if (state.spawnTimers[lane.id] <= 0) {
      const last = cars[cars.length - 1];
      if (!last || last.position > -WORLD_EDGE + 45 + gap) {
        const car = makeVehicle(state, lane.id, -WORLD_EDGE);
        if (last) car.speed = Math.min(car.speed, last.speed);
        state.vehicles.push(car);
        state.spawnTimers[lane.id] = (2.7 + random(state) * 1.3) / state.weather.roadCapacity;
      }
    }
  }
  state.vehicles = state.vehicles.filter((v) => v.position < WORLD_EDGE);
  state.recentPasses = state.recentPasses.filter((time) => time > state.time - 60);
}

export function getMetrics(state: SimulationState): Metrics {
  let queue = 0, nsQueue = 0, ewQueue = 0, waiting = 0, unfinishedWait = 0;
  for (const v of state.vehicles) {
    if (!v.passed) { unfinishedWait += v.waitTime; waiting++; }
    if (v.speed < 2 && v.position <= STOP_POSITION) {
      queue++;
      if (LANES[v.laneId].axis === "ns") nsQueue++; else ewQueue++;
    }
  }
  return {
    active: state.vehicles.length, queue, nsQueue, ewQueue, passed: state.passed,
    averageWait: (state.completedWait + unfinishedWait) / Math.max(1, state.passed + waiting),
    throughput: state.recentPasses.length * 60 / Math.max(1, Math.min(60, state.time)),
  };
}

export function getSnapshot(state: SimulationState): SimulationSnapshot {
  const duration = phaseDuration(state);
  return {
    time: state.time, phase: state.lights.phase,
    nsSignal: signalFor(state, "ns"), ewSignal: signalFor(state, "ew"),
    remaining: Math.max(0, duration - state.lights.elapsed),
    progress: Math.min(1, state.lights.elapsed / duration), metrics: getMetrics(state),
  };
}

export function vehiclePoint(lane: Lane, position: number): { x: number; y: number } {
  return { x: Math.cos(lane.angle) * position - Math.sin(lane.angle) * lane.offset, y: Math.sin(lane.angle) * position + Math.cos(lane.angle) * lane.offset };
}
