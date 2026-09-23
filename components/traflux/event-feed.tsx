import type { SimulationEvent } from "@/lib/simulation/types";

function eventTone(kind: SimulationEvent["kind"]) {
  if (kind === "incident") return "danger";
  if (kind === "emergency" || kind === "arrival") return "emergency";
  if (kind === "clearance") return "clear";
  if (kind === "surge") return "surge";
  return "neutral";
}

export function EventFeed({ events }: { events: SimulationEvent[] }) {
  const recent = [...events].reverse().slice(0, 3);
  if (!recent.length) return null;

  return <section className="event-feed" aria-live="polite" aria-label="Simulation events">
    {recent.map((event) => <article key={event.id} className={"event-toast " + eventTone(event.kind) + " glass"}>
      <span className="event-pulse" />
      <div><strong>{event.title}</strong><p>{event.detail}</p></div>
      <time>{Math.floor(event.at / 60).toString().padStart(2, "0")}:{Math.floor(event.at % 60).toString().padStart(2, "0")}</time>
    </article>)}
  </section>;
}
