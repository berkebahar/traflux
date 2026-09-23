# Traflux

**Control the flow.** A cinematic, clear-night traffic sandbox built with Next.js, TypeScript, and Canvas 2D. This first milestone contains one four-way intersection with two straight-through lanes per approach.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. No credentials, external services, or environment variables are needed. Geist fonts are bundled locally under the SIL Open Font License in `app/fonts/OFL.txt`.

## Controls

- Set North/South and East/West green durations independently, from 6 to 45 seconds. Changes affect the current cycle immediately; reducing the active green below its elapsed time initiates amber on the next simulation step.
- Adjust demand from 0.3× to 2.5×. Each lane has deterministic, staggered arrivals; full approaches defer spawns until safe space exists.
- Pause/resume and choose 1×, 2×, or 4× simulation speed.
- Reset restores the same initial traffic and zeroes metrics while retaining signal settings, demand, playback speed, and pause state.

Try 45 seconds North/South and 6 seconds East/West at 1.5× demand, then reverse the timings to see queues shift between approaches.

## Architecture

- `lib/simulation/types.ts`: vehicles, lanes, signal phases, settings, metrics, and environment modifiers.
- `lib/simulation/engine.ts`: DOM-independent seeded traffic engine. Fixed 1/60-second steps, acceleration/braking, leader following, safe spawn spacing, red-light stops, amber commitment, and all-red clearance. Orthogonal traffic cannot receive green until committed vehicles clear the intersection.
- `lib/rendering/city.ts`: procedural top-down city, cached static backdrop and vehicle sprites, interpolated movement, head/brake lights, signals, and subtle particles.
- `components/traflux/use-simulation.ts`: bounded animation loop, resize handling, pause/speed/reset, and throttled UI snapshots. Hidden tabs do not accumulate catch-up time. Reduced-motion preferences disable atmospheric particles and UI transitions; traffic remains visible and can be paused.
- `components/traflux/`: presentation and accessible native controls, separate from the engine.
- `app/`: server page/layout, local fonts, branding, and responsive styles.

The renderer caps pixel density at 2. The engine stays outside React state, with HUD updates about eight times per second. The engine's `WeatherModifiers` already affect speed, braking distance, following space/capacity, and demand; only neutral clear-night values are exposed in this milestone.

## Metrics

- **Active vehicles:** cars currently in the modeled road area, including approaches beyond the camera edges.
- **Average wait:** mean accumulated stopped time (below 2 world units/second, before the stop line), including completed crossings and current approaching vehicles. Completed vehicles contribute once.
- **Current queue:** approaching cars below that stopped-speed threshold, broken down by axis.
- **Vehicles passed:** vehicles that have cleared the intersection. Throughput is the trailing 60-second crossing count, normalized per minute during the first minute.

## Verify

```sh
npm run typecheck
npm run lint
npm run test:simulation
npm run build
```

The dependency-free simulation test harness uses the existing TypeScript compiler to load the engine. It checks deterministic replay, all signal phases, following gaps, red-light stops, crossing collisions, live timing/demand changes, weather-modifier changes, reset, and contrasting congestion scenarios. Rush-hour tests exercise over 100 active vehicles.

If a restricted environment prevents Turbopack's CSS workers from opening their local IPC port, `npm run build -- --webpack` uses Next.js's supported alternative bundler.

No turning, pedestrians, full weather mechanics, accounts, persistence, or external services are included in this milestone.
