import type { EnvironmentState, EnvironmentVisuals, TimeOfDay, WeatherMode, WeatherModifiers } from "./types";

export const WEATHER: Record<WeatherMode, { label: string; description: string; modifiers: WeatherModifiers; visuals: Omit<EnvironmentVisuals, "daylight" | "lampStrength"> }> = {
  clear: { label: "Clear", description: "Dry roads. Full visibility.", modifiers: { speed: 1, followingDistance: 1, brakingDistance: 1, roadCapacity: 1, demand: 1 }, visuals: { rain: 0, wetness: 0, fog: 0, snow: 0, cold: 0, darkness: 0 } },
  rain: { label: "Rain", description: "Wet roads. Leave more room.", modifiers: { speed: .9, followingDistance: 1.22, brakingDistance: 1.2, roadCapacity: .94, demand: 1 }, visuals: { rain: .45, wetness: .62, fog: .06, snow: 0, cold: .12, darkness: .06 } },
  storm: { label: "Storm", description: "Heavy rainfall. Reduced capacity.", modifiers: { speed: .75, followingDistance: 1.55, brakingDistance: 1.5, roadCapacity: .82, demand: 1 }, visuals: { rain: 1, wetness: 1, fog: .12, snow: 0, cold: .2, darkness: .14 } },
  fog: { label: "Fog", description: "Low visibility. Longer headways.", modifiers: { speed: .8, followingDistance: 1.5, brakingDistance: 1.1, roadCapacity: .9, demand: 1 }, visuals: { rain: 0, wetness: .12, fog: .7, snow: 0, cold: .15, darkness: .025 } },
  snow: { label: "Snow", description: "Cold roads. Brake early.", modifiers: { speed: .65, followingDistance: 1.8, brakingDistance: 1.8, roadCapacity: .76, demand: .95 }, visuals: { rain: 0, wetness: .18, fog: .13, snow: 1, cold: .85, darkness: .015 } },
};
export const TIMES: Record<TimeOfDay, { label: string; clock: string; demand: number; daylight: number; lampStrength: number }> = {
  morning: { label: "Morning", clock: "08:15", demand: 1.45, daylight: .56, lampStrength: .25 },
  day: { label: "Day", clock: "12:30", demand: 1, daylight: .9, lampStrength: .04 },
  evening: { label: "Evening", clock: "18:42", demand: 1.7, daylight: .3, lampStrength: .72 },
  night: { label: "Night", clock: "22:00", demand: .72, daylight: 0, lampStrength: 1 },
};
export function createEnvironment(weather: WeatherMode = "clear", timeOfDay: TimeOfDay = "night"): EnvironmentState {
  const time = TIMES[timeOfDay];
  return { weather, timeOfDay, modifiers: { ...WEATHER[weather].modifiers }, visuals: { ...WEATHER[weather].visuals, daylight: time.daylight, lampStrength: time.lampStrength }, automaticDemand: time.demand };
}
/** Exponential easing makes live changes continuous, independent of frame rate. */
export function stepEnvironment(environment: EnvironmentState, dt: number) {
  const target = createEnvironment(environment.weather, environment.timeOfDay);
  const blend = 1 - Math.exp(-dt / 3);
  for (const key of Object.keys(target.modifiers) as (keyof WeatherModifiers)[]) environment.modifiers[key] += (target.modifiers[key] - environment.modifiers[key]) * blend;
  for (const key of Object.keys(target.visuals) as (keyof EnvironmentVisuals)[]) environment.visuals[key] += (target.visuals[key] - environment.visuals[key]) * blend;
  environment.automaticDemand += (target.automaticDemand - environment.automaticDemand) * blend;
}
