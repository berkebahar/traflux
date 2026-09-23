import type { Challenge } from "./types";

export const CHALLENGES: Challenge[] = [
  {
    id: "school-run",
    number: "01",
    title: "SCHOOL RUN",
    timestamp: "08:15 — Weekday",
    narrative: "Morning traffic is stacking up around the district.",
    briefing: "Balance both approaches before the school-run wave locks the junction.",
    weather: "clear",
    timeOfDay: "morning",
    duration: 180,
    budget: 16000,
    settings: {
      demand: 1.15,
      demandMode: "manual",
      directionalDemand: { north: 1.55, south: 1.45, east: .9, west: .9 },
      vehicleMix: { heavy: 7, motorcycle: 6, emergency: 0, normal: "commuter" },
    },
    objectives: [
      { metric: "averageWait", label: "Average wait", target: 35, comparison: "at-most", primary: true },
      { metric: "maxQueue", label: "Maximum queue", target: 25, comparison: "at-most", primary: false },
    ],
    events: [],
    flowTarget: 130,
    idleTarget: 2400,
  },
  {
    id: "storm-front",
    number: "02",
    title: "STORM FRONT",
    timestamp: "18:42 — Friday",
    narrative: "Heavy rain has cut road capacity during the evening peak.",
    briefing: "A collision is expected mid-run. Keep the junction moving and preserve emergency access.",
    weather: "storm",
    timeOfDay: "evening",
    duration: 210,
    budget: 40000,
    settings: {
      demand: 1.2,
      demandMode: "manual",
      directionalDemand: { north: 1.2, south: 1.1, east: 1.35, west: 1.35 },
      vehicleMix: { heavy: 16, motorcycle: 4, emergency: 0, normal: "balanced" },
    },
    objectives: [
      { metric: "averageWait", label: "Average wait", target: 55, comparison: "at-most", primary: true },
      { metric: "emergencyResponseTime", label: "Emergency response", target: 48, comparison: "at-most", primary: false },
    ],
    events: [
      { at: 88, kind: "collision", direction: "west", duration: 58, response: "ambulance" },
    ],
    flowTarget: 115,
    idleTarget: 3600,
  },
  {
    id: "event-exit",
    number: "03",
    title: "EVENT EXIT",
    timestamp: "22:07 — Saturday",
    narrative: "Thousands of people are leaving a nearby venue at once.",
    briefing: "Absorb a sudden eastbound surge without letting queues overwhelm the network.",
    weather: "clear",
    timeOfDay: "night",
    duration: 180,
    budget: 22000,
    settings: {
      demand: 1,
      demandMode: "manual",
      directionalDemand: { north: .85, south: .85, east: 1, west: 1 },
      vehicleMix: { heavy: 10, motorcycle: 10, emergency: 0, normal: "balanced" },
    },
    objectives: [
      { metric: "passed", label: "Vehicles processed", target: 125, comparison: "at-least", primary: true },
      { metric: "maxQueue", label: "Maximum queue", target: 30, comparison: "at-most", primary: false },
    ],
    events: [
      { at: 42, kind: "surge", direction: "west", duration: 82, multiplier: 1.75 },
    ],
    flowTarget: 135,
    idleTarget: 2800,
  },
];

export function getChallenge(id: string) {
  return CHALLENGES.find((challenge) => challenge.id === id) ?? CHALLENGES[0];
}
