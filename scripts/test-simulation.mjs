import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Transpile the pure engine in memory; no test runner or generated files needed.
const source = await readFile(new URL("../lib/simulation/engine.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
const { createSimulation, stepSimulation, getMetrics, signalFor, vehiclePoint, LANES, STOP_POSITION } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

function verifySafety(state) {
  assert(!(signalFor(state, "ns") === "green" && signalFor(state, "ew") === "green"));
  for (const lane of LANES) {
    const cars = state.vehicles.filter(v => v.laneId === lane.id).sort((a, b) => b.position - a.position);
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      assert(Number.isFinite(car.position) && Number.isFinite(car.speed));
      assert(car.position >= car.previousPosition - 1e-8, "Cars cannot move backwards");
      if (i > 0) assert(cars[i - 1].position - car.position >= (cars[i - 1].length + car.length) / 2 + Math.min(12, 12 / state.weather.roadCapacity) - 1e-7, "Safe following gap violated");
      if (signalFor(state, lane.axis) === "red" && !car.committed) assert(car.position <= STOP_POSITION, "Uncommitted car ran a red light");
    }
  }
  const crossing = state.vehicles.filter(v => Math.abs(v.position) < 90);
  for (let i = 0; i < crossing.length; i++) {
    for (let j = i + 1; j < crossing.length; j++) {
      const a = crossing[i], b = crossing[j];
      const laneA = LANES[a.laneId], laneB = LANES[b.laneId];
      if (laneA.axis === laneB.axis) continue;
      const pa = vehiclePoint(laneA, a.position), pb = vehiclePoint(laneB, b.position);
      const aw = laneA.axis === "ew" ? a.length : 11, ah = laneA.axis === "ns" ? a.length : 11;
      const bw = laneB.axis === "ew" ? b.length : 11, bh = laneB.axis === "ns" ? b.length : 11;
      assert(Math.abs(pa.x - pb.x) >= (aw + bw) / 2 || Math.abs(pa.y - pb.y) >= (ah + bh) / 2, "Cross-traffic collision");
    }
  }
}

function run(settings, seconds, changes) {
  const state = createSimulation(settings);
  const phases = new Set();
  let peak = 0, queueTotal = 0, nsQueueTotal = 0, ewQueueTotal = 0;
  for (let tick = 0; tick < seconds * 60; tick++) {
    changes?.(state, tick);
    const uncommitted = state.vehicles.filter(v => !v.committed).map(v => v.id);
    stepSimulation(state);
    for (const v of state.vehicles) {
      if (uncommitted.includes(v.id) && signalFor(state, LANES[v.laneId].axis) === "red") {
        assert(v.position <= STOP_POSITION, "A previously uncommitted vehicle crossed during red");
      }
    }
    verifySafety(state);
    phases.add(state.lights.phase);
    peak = Math.max(peak, state.vehicles.length);
    if (tick % 60 === 0) {
      const m = getMetrics(state);
      queueTotal += m.queue; nsQueueTotal += m.nsQueue; ewQueueTotal += m.ewQueue;
    }
  }
  assert.equal(phases.size, 6, "Every signal phase must run");
  assert(state.passed > 0, "Traffic must cross the intersection");
  return { state, peak, meanQueue: queueTotal / seconds, nsQueue: nsQueueTotal / seconds, ewQueue: ewQueueTotal / seconds };
}

const normal = run({ nsGreen: 18, ewGreen: 18, demand: 1 }, 180);
const repeated = run({ nsGreen: 18, ewGreen: 18, demand: 1 }, 180);
assert.deepEqual(normal.state, repeated.state, "Identical inputs must produce identical runs");
assert(normal.peak >= 50, "Normal traffic should exercise at least 50 active cars");
assert(normal.meanQueue > 0, "Queues should form");
const rush = run({ nsGreen: 18, ewGreen: 18, demand: 2.5 }, 300);
assert(rush.peak >= 100, "Rush hour should exercise at least 100 active cars");
assert(rush.meanQueue > normal.meanQueue, "Demand must increase congestion");
const nsPriority = run({ nsGreen: 45, ewGreen: 6, demand: 1.5 }, 180);
const ewPriority = run({ nsGreen: 6, ewGreen: 45, demand: 1.5 }, 180);
assert(nsPriority.ewQueue > nsPriority.nsQueue * 1.5, "Short EW green must form a larger EW queue");
assert(ewPriority.nsQueue > ewPriority.ewQueue * 1.5, "Short NS green must form a larger NS queue");
run({ nsGreen: 18, ewGreen: 18, demand: 1 }, 180, (state, tick) => {
  if (tick === 500) state.settings = { nsGreen: 6, ewGreen: 45, demand: 2.5 };
  if (tick === 3000) state.settings = { nsGreen: 45, ewGreen: 6, demand: 0.3 };
  if (tick === 6000) state.weather = { speed: 0.7, brakingDistance: 1.4, roadCapacity: 0.8, demand: 0.85 };
});
assert.deepEqual(createSimulation(), createSimulation(), "Reset must restore the seeded initial state");
console.log(`PASS: deterministic replay, signal phases, red-light stopping, safe gaps, cross-traffic collision checks, live settings, weather modifiers, reset, and congestion response.`);
console.log(`Normal traffic: peak ${normal.peak}, mean queue ${normal.meanQueue.toFixed(1)}. Rush hour: peak ${rush.peak}, mean queue ${rush.meanQueue.toFixed(1)}.`);
console.log(`NS priority queues: NS ${nsPriority.nsQueue.toFixed(1)} / EW ${nsPriority.ewQueue.toFixed(1)}. EW priority: NS ${ewPriority.nsQueue.toFixed(1)} / EW ${ewPriority.ewQueue.toFixed(1)}.`);
