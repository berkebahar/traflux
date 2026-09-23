"use client";

import type { Axis, Direction, EmergencyType, ImplementedIncidentKind, SimulationSettings, SimulationSnapshot, TimeOfDay, VehicleMix, WeatherMode } from "@/lib/simulation/types";

const WEATHER_OPTIONS: { value: WeatherMode; label: string }[] = [
  { value: "clear", label: "Clear" },
  { value: "rain", label: "Rain" },
  { value: "storm", label: "Storm" },
  { value: "fog", label: "Fog" },
  { value: "snow", label: "Snow" },
];

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "day", label: "Day" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "north", label: "N" },
  { value: "south", label: "S" },
  { value: "east", label: "E" },
  { value: "west", label: "W" },
];

function MiniRange({ label, value, min, max, step = .1, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return <label className="dock-range">
    <span>{label}<b>{value.toFixed(step < 1 ? 1 : 0)}{label.length <= 1 ? "×" : "%"}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

export function ControlDock({
  settings,
  snapshot,
  onShowChallenges,
  onOpenSandbox,
  changeWeather,
  changeTime,
  changeDirectionalDemand,
  changeVehicleMix,
  setDemandMode,
  setRandomIncidents,
  triggerEvent,
  dispatch,
  requestPriority,
  clearIncident,
}: {
  settings: SimulationSettings;
  snapshot: SimulationSnapshot;
  onShowChallenges: () => void;
  onOpenSandbox: () => void;
  changeWeather: (weather: WeatherMode) => void;
  changeTime: (time: TimeOfDay) => void;
  changeDirectionalDemand: (direction: Direction, value: number) => void;
  changeVehicleMix: (key: keyof Pick<VehicleMix, "heavy" | "motorcycle" | "emergency">, value: number) => void;
  setDemandMode: (mode: SimulationSettings["demandMode"]) => void;
  setRandomIncidents: (value: boolean) => void;
  triggerEvent: (kind: ImplementedIncidentKind, direction?: Direction) => void;
  dispatch: (type?: EmergencyType) => void;
  requestPriority: (axis: Axis) => boolean;
  clearIncident: (incidentId: number) => boolean;
}) {
  const activeIncident = snapshot.incidents.find((incident) => incident.status === "active" && incident.kind !== "surge");
  const budget = snapshot.challenge?.budget;

  return <aside className="control-dock glass">
    <div className="mode-switch" role="group" aria-label="Simulation mode">
      <button className={!snapshot.challenge ? "selected" : ""} onClick={onOpenSandbox}>SANDBOX</button>
      <button className={snapshot.challenge ? "selected" : ""} onClick={onShowChallenges}>CHALLENGES</button>
    </div>

    {snapshot.challenge && <div className="challenge-strip">
      <span>CHALLENGE ACTIVE</span>
      <strong>{"$" + (budget ?? 0).toLocaleString()}</strong>
    </div>}

    {!snapshot.challenge && <>
      <div className="dock-section">
        <div className="dock-heading"><span>ENVIRONMENT</span><small>LIVE</small></div>
        <div className="chip-grid weather-grid">
          {WEATHER_OPTIONS.map((option) => <button key={option.value} className={snapshot.environment.weather === option.value ? "selected" : ""} onClick={() => changeWeather(option.value)}>{option.label}</button>)}
        </div>
        <div className="chip-grid time-grid">
          {TIME_OPTIONS.map((option) => <button key={option.value} className={snapshot.environment.timeOfDay === option.value ? "selected" : ""} onClick={() => changeTime(option.value)}>{option.label}</button>)}
        </div>
      </div>

      <details className="dock-details">
        <summary>TRAFFIC MIX & DEMAND</summary>
        <div className="dock-inline-toggle">
          <button className={settings.demandMode === "auto" ? "selected" : ""} onClick={() => setDemandMode("auto")}>Time-based</button>
          <button className={settings.demandMode === "manual" ? "selected" : ""} onClick={() => setDemandMode("manual")}>Manual</button>
        </div>
        <div className="direction-ranges">
          {DIRECTIONS.map(({ value, label }) => <MiniRange key={value} label={label} value={settings.directionalDemand[value]} min={.4} max={2.2} onChange={(next) => changeDirectionalDemand(value, next)} />)}
        </div>
        <MiniRange label="Heavy" value={settings.vehicleMix.heavy} min={0} max={50} step={1} onChange={(next) => changeVehicleMix("heavy", next)} />
        <MiniRange label="Motorcycle" value={settings.vehicleMix.motorcycle} min={0} max={40} step={1} onChange={(next) => changeVehicleMix("motorcycle", next)} />
        <MiniRange label="Emergency" value={settings.vehicleMix.emergency} min={0} max={12} step={1} onChange={(next) => changeVehicleMix("emergency", next)} />
        <label className="dock-check"><input type="checkbox" checked={settings.randomIncidents} onChange={(event) => setRandomIncidents(event.target.checked)} /> Autonomous incidents</label>
      </details>
    </>}

    {!snapshot.challenge && <div className="dock-section events-section">
      <div className="dock-heading"><span>INCIDENT SYSTEM</span><small>AUTONOMOUS</small></div>
      <p className="dock-copy">Breakdowns, surges, and occasional collisions now arrive on their own while the sandbox runs.</p>
      <details className="test-events">
        <summary>TEST AN EVENT</summary>
        <div className="event-buttons">
          <button onClick={() => triggerEvent("breakdown")}>Breakdown</button>
          <button onClick={() => triggerEvent("collision")}>Minor collision</button>
          <button onClick={() => triggerEvent("surge")}>Traffic surge</button>
          <button onClick={() => dispatch("police")}>Police</button>
          <button onClick={() => dispatch("ambulance")}>Ambulance</button>
          <button onClick={() => dispatch("fire")}>Fire engine</button>
        </div>
      </details>
    </div>}

    <div className="dock-section intervention-section">
      <div className="dock-heading"><span>INTERVENTIONS</span><small>{snapshot.challenge ? "BUDGETED" : "FREE"}</small></div>
      <div className="event-buttons two">
        <button onClick={() => requestPriority("ns")}>N/S priority{snapshot.challenge ? " · $2k" : ""}</button>
        <button onClick={() => requestPriority("ew")}>E/W priority{snapshot.challenge ? " · $2k" : ""}</button>
      </div>
      {activeIncident && <button className="clearance-button" onClick={() => clearIncident(activeIncident.id)}>
        Accelerate clearance{snapshot.challenge ? " · $8k" : ""} <span>{Math.ceil(activeIncident.remaining)}s left</span>
      </button>}
    </div>
  </aside>;
}
