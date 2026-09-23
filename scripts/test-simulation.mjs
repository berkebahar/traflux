import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";

const simulationDir = fileURLToPath(new URL("../lib/simulation/", import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), "traflux-sim-"));

async function compileSimulation() {
  const files = (await readdir(simulationDir)).filter((name) => name.endsWith(".ts"));
  for (const name of files) {
    const source = await readFile(join(simulationDir, name), "utf8");
    const { outputText, diagnostics } = ts.transpileModule(source, {
      fileName: name,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: true,
      },
    });

    const errors = (diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    assert.equal(errors.length, 0, `TypeScript transpile error in ${name}`);

    const withExtensions = outputText
      .replace(/from\s+["'](\.\/[A-Za-z0-9_-]+)["']/g, 'from "$1.mjs"')
      .replace(/import\(["'](\.\/[A-Za-z0-9_-]+)["']\)/g, 'import("$1.mjs")');

    await writeFile(join(tempDir, name.replace(/\.ts$/, ".mjs")), withExtensions);
  }
}

await compileSimulation();

const engine = await import(pathToFileURL(join(tempDir, "engine.mjs")).href);
const {
  LANES,
  STOP_POSITION,
  createChallengeSimulation,
  createSimulation,
  getMetrics,
  setWeather,
  signalFor,
  stepSimulation,
  triggerEmergency,
  triggerSandboxIncident,
  vehiclePoint,
} = engine;

function verifySafety(state) {
  assert(!(signalFor(state, "ns") === "green" && signalFor(state, "ew") === "green"));

  for (const lane of LANES) {
    const cars = state.vehicles
      .filter((vehicle) => vehicle.laneId === lane.id)
      .sort((a, b) => b.position - a.position);

    for (let index = 0; index < cars.length; index++) {
      const car = cars[index];
      assert(Number.isFinite(car.position) && Number.isFinite(car.speed));
      assert(car.position >= car.previousPosition - 1e-7, "Vehicles cannot move backwards");

      if (index > 0) {
        const leader = cars[index - 1];
        const separation = leader.position - car.position;
        const nonOverlap = (leader.length + car.length) / 2 - .5;
        assert(separation >= nonOverlap, "Same-lane vehicles overlapped");
      }

      if (signalFor(state, lane.axis) === "red" && !car.committed) {
        assert(car.position <= STOP_POSITION + 1e-6, "Uncommitted vehicle ran a red light");
      }
    }
  }

  const crossing = state.vehicles.filter((vehicle) => Math.abs(vehicle.position) < 88 && vehicle.incidentId === null);
  for (let i = 0; i < crossing.length; i++) {
    for (let j = i + 1; j < crossing.length; j++) {
      const a = crossing[i];
      const b = crossing[j];
      const laneA = LANES[a.laneId];
      const laneB = LANES[b.laneId];
      if (laneA.axis === laneB.axis) continue;

      const pa = vehiclePoint(laneA, a.position);
      const pb = vehiclePoint(laneB, b.position);
      const aw = laneA.axis === "ew" ? a.length : a.width;
      const ah = laneA.axis === "ns" ? a.length : a.width;
      const bw = laneB.axis === "ew" ? b.length : b.width;
      const bh = laneB.axis === "ns" ? b.length : b.width;

      assert(
        Math.abs(pa.x - pb.x) >= (aw + bw) / 2 ||
        Math.abs(pa.y - pb.y) >= (ah + bh) / 2,
        "Cross-traffic collision occurred outside the scripted incident system",
      );
    }
  }
}

function run(settings, seconds, changes) {
  const state = createSimulation(settings);
  const phases = new Set();
  let peak = 0;
  let queueTotal = 0;
  let nsQueueTotal = 0;
  let ewQueueTotal = 0;

  for (let tick = 0; tick < seconds * 60; tick++) {
    changes?.(state, tick);
    stepSimulation(state);
    verifySafety(state);
    phases.add(state.lights.phase);
    peak = Math.max(peak, state.vehicles.length);

    if (tick % 60 === 0) {
      const metrics = getMetrics(state);
      queueTotal += metrics.queue;
      nsQueueTotal += metrics.nsQueue;
      ewQueueTotal += metrics.ewQueue;
    }
  }

  assert(state.passed > 0, "Traffic must cross the intersection");
  return {
    state,
    phases,
    peak,
    meanQueue: queueTotal / seconds,
    nsQueue: nsQueueTotal / seconds,
    ewQueue: ewQueueTotal / seconds,
  };
}

try {
  const normal = run({ nsGreen: 18, ewGreen: 18, demand: 1, demandMode: "manual" }, 150);
  const repeated = run({ nsGreen: 18, ewGreen: 18, demand: 1, demandMode: "manual" }, 150);

  assert.deepEqual(normal.state, repeated.state, "Identical inputs must produce deterministic runs");
  assert(normal.phases.size >= 5, "Signal controller should visit the full cycle");
  assert(normal.meanQueue > 0, "Queues should form under ordinary demand");

  const rush = run({ nsGreen: 18, ewGreen: 18, demand: 2.4, demandMode: "manual" }, 180);
  assert(rush.peak > normal.peak, "Higher demand should increase active traffic");
  assert(rush.meanQueue > normal.meanQueue, "Higher demand should increase congestion");

  const weatherState = createSimulation({ demandMode: "manual" });
  setWeather(weatherState, "storm");
  for (let i = 0; i < 240; i++) stepSimulation(weatherState);
  assert(weatherState.environment.modifiers.speed < .9, "Storm must reduce target speed");
  assert(weatherState.environment.modifiers.roadCapacity < .95, "Storm must reduce road capacity");

  const incidentState = createSimulation({ demand: 1.7, demandMode: "manual" });
  const incident = triggerSandboxIncident(incidentState, "collision", "west");
  assert.equal(incident.kind, "collision");
  assert.equal(incident.status, "active");
  assert(incident.vehicleIds.length >= 1, "Scripted collision should hold at least one vehicle");
  const held = incidentState.vehicles.find((vehicle) => incident.vehicleIds.includes(vehicle.id));
  assert(held?.incidentId === incident.id, "Collision vehicle should reference the incident");

  triggerEmergency(incidentState, "ambulance", "west");
  assert(incidentState.vehicles.some((vehicle) => vehicle.type === "ambulance" && vehicle.emergency), "Emergency response should spawn an ambulance");
  for (let i = 0; i < 60 * 25; i++) stepSimulation(incidentState);
  assert(getMetrics(incidentState).queue > 0, "Blocked lane should create a measurable queue");

  const challenge = createChallengeSimulation("storm-front");
  for (let i = 0; i < 60 * 95; i++) stepSimulation(challenge);
  assert(challenge.challenge?.firedEvents.includes(0), "Storm Front should fire its scripted incident");
  assert(challenge.incidents.some((item) => item.kind === "collision"), "Storm Front should create its collision event");
  assert(challenge.responses.some((response) => response.type === "ambulance"), "Storm Front should dispatch emergency response");

  while (challenge.challenge?.status === "running") stepSimulation(challenge);
  assert(challenge.challenge?.result, "Challenge should end with a score");
  assert(challenge.challenge.result.score.overall >= 0 && challenge.challenge.result.score.overall <= 100, "Overall score must be bounded");

  assert.deepEqual(createSimulation(), createSimulation(), "Reset seed must be deterministic");

  console.log("PASS: deterministic traffic, signal safety, weather effects, congestion response, scripted incidents, emergency response, and challenge scoring.");
  console.log(`Normal mean queue: ${normal.meanQueue.toFixed(1)} · Rush mean queue: ${rush.meanQueue.toFixed(1)} · Storm Front score: ${challenge.challenge.result.score.overall}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
