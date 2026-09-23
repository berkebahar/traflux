"use client";

import { CHALLENGES, getChallenge } from "@/lib/simulation/challenges";
import type { SimulationSnapshot } from "@/lib/simulation/types";

function formatValue(value: number | null, label: string) {
  if (value === null) return "—";
  if (label.toLowerCase().includes("wait") || label.toLowerCase().includes("response")) return value.toFixed(1) + "s";
  return Math.round(value).toString();
}

export function ChallengeBrowser({ open, onClose, onStart }: {
  open: boolean;
  onClose: () => void;
  onStart: (id: string) => void;
}) {
  if (!open) return null;

  return <div className="challenge-overlay" role="dialog" aria-modal="true" aria-label="Traflux challenges">
    <div className="challenge-browser glass">
      <div className="challenge-browser-head">
        <div>
          <span className="eyebrow">TRAFLUX OPERATIONS</span>
          <h2>Choose the pressure.</h2>
          <p>Three scenarios. Different demand patterns, conditions, and objectives.</p>
        </div>
        <button className="overlay-close" onClick={onClose} aria-label="Close challenges">×</button>
      </div>

      <div className="challenge-cards">
        {CHALLENGES.map((challenge) => <article key={challenge.id} className="challenge-card">
          <div className="challenge-number">{challenge.number}</div>
          <span className="challenge-time">{challenge.timestamp}</span>
          <h3>{challenge.title}</h3>
          <p>{challenge.narrative}</p>

          <div className="challenge-conditions">
            <span>{challenge.weather.toUpperCase()}</span>
            <span>{challenge.timeOfDay.toUpperCase()}</span>
            <span>{"$" + challenge.budget.toLocaleString()}</span>
          </div>

          <div className="challenge-objectives">
            {challenge.objectives.map((objective) => <span key={objective.label}>
              {objective.primary ? "PRIMARY" : "SECONDARY"} · {objective.label} {objective.comparison === "at-most" ? "≤" : "≥"} {objective.target}{objective.metric === "averageWait" || objective.metric === "emergencyResponseTime" ? "s" : ""}
            </span>)}
          </div>

          <button className="start-challenge" onClick={() => onStart(challenge.id)}>START SIMULATION</button>
        </article>)}
      </div>
    </div>
  </div>;
}

export function ChallengeHUD({ snapshot }: { snapshot: SimulationSnapshot }) {
  if (!snapshot.challenge || snapshot.challenge.status !== "running") return null;
  const challenge = getChallenge(snapshot.challenge.id);
  const remaining = Math.max(0, challenge.duration - snapshot.time);

  return <section className="challenge-hud glass">
    <span className="eyebrow">CHALLENGE {challenge.number}</span>
    <div className="challenge-hud-title">
      <strong>{challenge.title}</strong>
      <b>{Math.ceil(remaining)}s</b>
    </div>
    <p>{challenge.briefing}</p>
    <div className="challenge-hud-bottom">
      <span>{"BUDGET $" + snapshot.challenge.budget.toLocaleString()}</span>
      <span>{challenge.objectives[0].label.toUpperCase()}</span>
    </div>
  </section>;
}

export function ChallengeResultOverlay({ snapshot, onRetry, onNext, onChallenges, onSandbox }: {
  snapshot: SimulationSnapshot;
  onRetry: () => void;
  onNext: () => void;
  onChallenges: () => void;
  onSandbox: () => void;
}) {
  const run = snapshot.challenge;
  if (!run || run.status !== "finished" || !run.result) return null;

  const challenge = getChallenge(run.id);
  const currentIndex = CHALLENGES.findIndex((item) => item.id === challenge.id);
  const hasNext = currentIndex >= 0 && currentIndex + 1 < CHALLENGES.length;
  const { score } = run.result;

  return <div className="challenge-overlay result" role="dialog" aria-modal="true" aria-label="Challenge result">
    <div className="result-card glass">
      <span className="eyebrow">{run.result.success ? "OBJECTIVE COMPLETE" : "RUN COMPLETE"}</span>
      <h2>{challenge.title}</h2>

      <div className="overall-score">
        <strong>{score.overall}</strong>
        <span>OVERALL</span>
      </div>

      <div className="score-grid">
        <span>FLOW<b>{score.flow}</b></span>
        <span>WAIT<b>{score.wait}</b></span>
        <span>QUEUE<b>{score.queue}</b></span>
        <span>BUDGET<b>{score.budget}</b></span>
        <span>ENVIRONMENT*<b>{score.environment}</b></span>
      </div>

      <div className="result-objectives">
        {run.result.objectives.map((objective) => <div key={objective.label} className={objective.passed ? "passed" : "missed"}>
          <span>{objective.passed ? "✓ " : "— "}{objective.label}</span>
          <b>{formatValue(objective.value, objective.label)} / {objective.target}</b>
        </div>)}
      </div>

      <p className="estimate-note">*Environment is a simulation estimate based on weighted idle time, not a real-world emissions measurement.</p>

      <div className="result-actions">
        <button onClick={onRetry}>Retry</button>
        {hasNext && <button className="primary" onClick={onNext}>Next challenge</button>}
        <button onClick={onChallenges}>Challenges</button>
        <button onClick={onSandbox}>Open in Sandbox</button>
      </div>
    </div>
  </div>;
}
