export type Direction = "north" | "south" | "east" | "west";
export type Axis = "ns" | "ew";
export type SignalColor = "green" | "amber" | "red";
export type SignalPhase = "ns-green" | "ns-amber" | "ns-clear" | "ew-green" | "ew-amber" | "ew-clear";
export type WeatherMode = "clear" | "rain" | "storm" | "fog" | "snow";
export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type VehicleType = "compact" | "sedan" | "suv" | "van" | "truck" | "bus" | "motorcycle" | "police" | "ambulance" | "fire";
export type EmergencyType = "police" | "ambulance" | "fire";
export type GameMode = "sandbox" | "challenge";

export interface Lane { id: number; origin: Direction; axis: Axis; offset: number; angle: number }
export interface Intersection { id: string; lanes: Lane[]; roadHalfWidth: number; stopLine: number; clearanceEdge: number; worldEdge: number }
export interface VehicleClassConfig {
  type: VehicleType;
  label: string;
  length: number;
  width: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  followingGap: number;
  visualStyle: "car" | "van" | "truck" | "bus" | "motorcycle" | "police" | "ambulance" | "fire";
  emergency: boolean;
  passengerValue: number;
  idleWeight: number;
}
export interface Vehicle {
  id: number;
  type: VehicleType;
  laneId: number;
  position: number;
  previousPosition: number;
  speed: number;
  length: number;
  width: number;
  color: string;
  waitTime: number;
  braking: boolean;
  committed: boolean;
  passed: boolean;
  emergency: boolean;
  priority: boolean;
  responseId: number | null;
  incidentId: number | null;
}
export interface TrafficLights { phase: SignalPhase; elapsed: number; priorityAxis: Axis | null }
export interface WeatherModifiers { speed: number; followingDistance: number; brakingDistance: number; roadCapacity: number; demand: number }
export interface EnvironmentVisuals { daylight: number; lampStrength: number; rain: number; wetness: number; fog: number; snow: number; cold: number; darkness: number }
export interface EnvironmentState {
  weather: WeatherMode;
  timeOfDay: TimeOfDay;
  modifiers: WeatherModifiers;
  visuals: EnvironmentVisuals;
  automaticDemand: number;
}
export interface VehicleMix { heavy: number; motorcycle: number; emergency: number; normal: "balanced" | "commuter" | "commercial" }
export interface SimulationSettings {
  nsGreen: number;
  ewGreen: number;
  demand: number;
  demandMode: "auto" | "manual";
  directionalDemand: Record<Direction, number>;
  vehicleMix: VehicleMix;
  emergencyPriority: boolean;
  randomIncidents: boolean;
  showCongestion: boolean;
}
export type IncidentKind = "breakdown" | "collision" | "surge" | "closure" | "roadworks";
export type ImplementedIncidentKind = "breakdown" | "collision" | "surge";
export interface Incident {
  id: number;
  kind: IncidentKind;
  laneId: number | null;
  position: number;
  vehicleIds: number[];
  startedAt: number;
  blockedAt: number | null;
  duration: number;
  remaining: number;
  status: "braking" | "active" | "cleared";
  clearedAt: number | null;
  directions: Direction[];
  demandMultiplier: number;
  responseId: number | null;
}
export interface EmergencyResponse {
  id: number;
  type: EmergencyType;
  origin: Direction;
  laneId: number;
  incidentId: number | null;
  vehicleId: number | null;
  requestedAt: number;
  spawnedAt: number | null;
  arrivedAt: number | null;
  status: "dispatching" | "approaching" | "on-scene" | "complete";
  serviceUntil: number | null;
  targetPosition: number;
}
/** Typed, bounded event stream; a future sound adapter can consume these without changing physics. */
export interface SimulationEvent {
  id: number;
  at: number;
  kind: "incident" | "clearance" | "surge" | "emergency" | "arrival" | "environment" | "intervention" | "challenge";
  title: string;
  detail: string;
  incidentId?: number;
  responseId?: number;
}
export type InterventionType = "green-priority" | "clear-incident";
export interface PriorityIntervention { axis: Axis; until: number }
export interface SimulationMetrics {
  active: number; averageWait: number; queue: number; passed: number; throughput: number;
  nsQueue: number; ewQueue: number; maxQueue: number; totalIdleTime: number; weightedIdleTime: number;
  passengerThroughput: number; emergencyResponseTime: number | null; pendingResponses: number;
  laneQueues: number[];
  passedByType: Record<VehicleType, number>;
}
export type Metrics = SimulationMetrics;
export interface ChallengeObjective {
  metric: "averageWait" | "maxQueue" | "passed" | "emergencyResponseTime" | "passedByType";
  label: string;
  target: number;
  comparison: "at-most" | "at-least";
  primary: boolean;
  vehicleType?: VehicleType;
}
export interface ChallengeScheduledEvent {
  at: number;
  kind: ImplementedIncidentKind;
  direction: Direction;
  duration: number;
  multiplier?: number;
  response?: EmergencyType;
}
export interface Challenge {
  id: string; number: string; title: string; timestamp: string; narrative: string; briefing: string;
  weather: WeatherMode; timeOfDay: TimeOfDay; duration: number; budget: number;
  settings: Partial<SimulationSettings>;
  objectives: ChallengeObjective[];
  events: ChallengeScheduledEvent[];
  flowTarget: number;
  idleTarget: number;
}
export interface ScoreBreakdown { flow: number; wait: number; queue: number; budget: number; environment: number; overall: number }
export interface ChallengeResult {
  score: ScoreBreakdown;
  objectives: { label: string; value: number | null; target: number; passed: boolean; primary: boolean }[];
  success: boolean;
  metrics: SimulationMetrics;
  remainingBudget: number;
}
export interface ChallengeRun {
  id: string;
  status: "running" | "finished";
  budget: number;
  initialBudget: number;
  firedEvents: number[];
  result: ChallengeResult | null;
}
export interface SimulationState {
  time: number;
  mode: GameMode;
  vehicles: Vehicle[];
  lights: TrafficLights;
  settings: SimulationSettings;
  environment: EnvironmentState;
  spawnTimers: number[];
  nextId: number;
  randomSeed: number;
  incidentSeed: number;
  passed: number;
  completedWait: number;
  recentPasses: number[];
  maxQueue: number;
  totalIdleTime: number;
  weightedIdleTime: number;
  passengerThroughput: number;
  passedByType: Record<VehicleType, number>;
  incidents: Incident[];
  responses: EmergencyResponse[];
  events: SimulationEvent[];
  nextEventId: number;
  nextIncidentId: number;
  nextResponseId: number;
  nextRandomIncidentAt: number;
  priority: PriorityIntervention | null;
  challenge: ChallengeRun | null;
}
export interface SimulationSnapshot {
  time: number; phase: SignalPhase; nsSignal: SignalColor; ewSignal: SignalColor;
  remaining: number; progress: number; metrics: SimulationMetrics;
  environment: EnvironmentState; incidents: Incident[]; responses: EmergencyResponse[]; events: SimulationEvent[];
  priorityAxis: Axis | null; priority: PriorityIntervention | null; challenge: ChallengeRun | null;
}
