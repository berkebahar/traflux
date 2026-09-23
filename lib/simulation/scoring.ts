import type { Challenge, ChallengeResult, SimulationMetrics } from "./types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function objectiveValue(metrics: SimulationMetrics, challenge: Challenge, index: number): number | null {
  const objective = challenge.objectives[index];
  if (!objective) return null;
  if (objective.metric === "averageWait") return metrics.averageWait;
  if (objective.metric === "maxQueue") return metrics.maxQueue;
  if (objective.metric === "passed") return metrics.passed;
  if (objective.metric === "emergencyResponseTime") return metrics.emergencyResponseTime;
  if (objective.metric === "passedByType") return objective.vehicleType ? metrics.passedByType[objective.vehicleType] : 0;
  return null;
}

export function scoreChallenge(
  challenge: Challenge,
  metrics: SimulationMetrics,
  remainingBudget: number,
  initialBudget: number,
): ChallengeResult {
  const flow = clamp((metrics.passed / Math.max(1, challenge.flowTarget)) * 100);
  const waitTarget = challenge.objectives.find((objective) => objective.metric === "averageWait")?.target ?? 45;
  const wait = clamp(100 - Math.max(0, metrics.averageWait - waitTarget * .35) / Math.max(1, waitTarget * 1.15) * 100);
  const queueTarget = challenge.objectives.find((objective) => objective.metric === "maxQueue")?.target ?? 28;
  const queue = clamp(100 - Math.max(0, metrics.maxQueue - queueTarget * .35) / Math.max(1, queueTarget * 1.2) * 100);
  const budget = clamp((remainingBudget / Math.max(1, initialBudget)) * 100);
  const environment = clamp(100 - (metrics.weightedIdleTime / Math.max(1, challenge.idleTarget)) * 100);

  const objectives = challenge.objectives.map((objective, index) => {
    const value = objectiveValue(metrics, challenge, index);
    const passed = value !== null && (
      objective.comparison === "at-most" ? value <= objective.target : value >= objective.target
    );
    return { label: objective.label, value, target: objective.target, passed, primary: objective.primary };
  });

  const overall = clamp(flow * .28 + wait * .24 + queue * .2 + budget * .14 + environment * .14);
  const primary = objectives.filter((objective) => objective.primary);

  return {
    score: { flow, wait, queue, budget, environment, overall },
    objectives,
    success: primary.every((objective) => objective.passed),
    metrics: {
      ...metrics,
      laneQueues: [...metrics.laneQueues],
      passedByType: { ...metrics.passedByType },
    },
    remainingBudget,
  };
}
