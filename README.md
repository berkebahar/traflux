# Traflux

**Control the flow.** Traflux is a cinematic traffic strategy game and sandbox built with Next.js, TypeScript, and Canvas 2D.

The current `traflux-v0.2` branch expands the original single-intersection prototype into a living simulation with weather, time of day, mixed vehicle classes, scripted incidents, emergency response, challenge scenarios, scoring, and a deeper sandbox.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000.

No credentials, external APIs, database, or environment variables are required.

## v0.2 features

- Five weather modes: Clear, Rain, Storm, Fog, and Snow.
- Weather changes speed, following distance, braking behavior, and effective road capacity.
- Morning, Day, Evening, and Night environments with time-based demand.
- Compact cars, sedans, SUVs, vans, delivery trucks, buses, motorcycles, police vehicles, ambulances, and fire engines.
- Scripted breakdowns, traffic surges, and minor collision incidents.
- Emergency response with signal-priority requests and arrival timing.
- Sandbox controls for directional demand, vehicle mix, weather, time, incidents, congestion indicators, and interventions.
- Three challenge scenarios: School Run, Storm Front, and Event Exit.
- Challenge budgets, signal-priority intervention, accelerated incident clearance, objective tracking, and a five-part Traflux score.
- Compact live event feed and challenge HUD.
- Reduced-motion support for atmospheric effects.

Normal traffic remains collision-free. Collision events are deliberately scripted incidents rather than failures of the car-following model.

## Simulation architecture

- `lib/simulation/types.ts`: shared simulation types.
- `lib/simulation/lanes.ts`: lane/intersection geometry.
- `lib/simulation/vehicles.ts`: vehicle classes and traffic mix.
- `lib/simulation/environment.ts`: weather and time-of-day models.
- `lib/simulation/incidents.ts`: incidents, surges, and emergency response.
- `lib/simulation/challenges.ts`: scenario definitions.
- `lib/simulation/scoring.ts`: challenge scoring.
- `lib/simulation/engine.ts`: fixed-step traffic engine and gameplay integration.
- `lib/rendering/city.ts`: procedural city rendering, vehicle sprites, weather, lighting, congestion, and incident effects.
- `components/traflux/use-simulation.ts`: animation loop and simulation controls.
- `components/traflux/`: HUD, signal panel, sandbox dock, events, challenges, and results.

The engine uses a fixed 1/60-second step and deterministic seeded traffic generation. Metrics come from simulation state rather than separate fake counters.

## Challenge scenarios

### 01 — School Run
Morning rush with heavier North/South demand. Keep average wait and maximum queue under control.

### 02 — Storm Front
Evening peak in heavy rain. A scripted collision occurs during the run and an ambulance is dispatched.

### 03 — Event Exit
Night traffic is hit by a large temporary demand surge. Process enough vehicles without severe gridlock.

## Metrics

- Active vehicles
- Average wait
- Current queue
- Vehicles passed / throughput
- Maximum queue
- Weighted idle time
- Passenger throughput
- Emergency response time
- Per-vehicle-type throughput

The environment score in challenge results is a simulation estimate based on weighted idle time; it is not presented as a real-world emissions measurement.

## Verify

```sh
npm run typecheck
npm run lint
npm run test:simulation
npm run build
```

The simulation test covers deterministic replay, signal safety, congestion response, live weather effects, scripted incidents, emergency response, and challenge scoring.

If a restricted environment causes a Turbopack build issue, try:

```sh
npm run build -- --webpack
```

## Deliberately not included yet

No accounts, Supabase, database, multiplayer, payments, analytics, leaderboards, AI optimization, real maps, or external map APIs are part of v0.2.
