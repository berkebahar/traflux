import type { Metrics as SimulationMetrics } from "@/lib/simulation/types";
import { Icon } from "./icons";

export function Metrics({ metrics }: { metrics: SimulationMetrics }) {
  return <section className="metrics glass" aria-label="Live traffic metrics">
    <div className="metric"><div className="metric-label"><Icon name="car" size={15} /> ACTIVE VEHICLES</div><div className="metric-value">{metrics.active}<span>on the road</span></div><div className="metric-detail"><span className="tiny-dot" /> Four approaches · eight lanes</div></div>
    <div className="metric"><div className="metric-label"><Icon name="clock" size={15} /> AVERAGE WAIT</div><div className="metric-value">{metrics.averageWait.toFixed(1)}<span>seconds</span></div><div className="metric-detail">Mean stopped time per vehicle</div></div>
    <div className="metric"><div className="metric-label"><Icon name="queue" size={15} /> CURRENT QUEUE</div><div className="metric-value">{metrics.queue}<span>vehicles</span></div><div className="metric-detail">N / S <b>{metrics.nsQueue}</b><span className="detail-divider">/</span>E / W <b>{metrics.ewQueue}</b></div></div>
    <div className="metric"><div className="metric-label"><Icon name="flow" size={15} /> VEHICLES PASSED</div><div className="metric-value accent">{metrics.passed}<span>total</span></div><div className="metric-detail"><span className="throughput">↗ {Math.round(metrics.throughput)}</span> vehicles / min · rolling 60s</div></div>
  </section>;
}
