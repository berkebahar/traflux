import type { CSSProperties } from "react";
import type { SignalColor, SimulationSettings, SimulationSnapshot } from "@/lib/simulation/types";
import { Icon } from "./icons";

function SignalDots({ active }: { active: SignalColor }) {
  return <span className="signal-dots" aria-label={`${active} light`}>{(["red", "amber", "green"] as const).map(color => <span key={color} className={`signal-dot ${color} ${active === color ? "lit" : ""}`} />)}</span>;
}

function Slider({ id, label, value, min, max, step = 1, display, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; display: string; onChange: (value: number) => void }) {
  return <div className="slider-field">
    <div className="slider-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display}</output></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={display} onChange={event => onChange(Number(event.target.value))} style={{ "--fill": `${(value - min) / (max - min) * 100}%` } as CSSProperties} />
    <div className="range-extents"><span>{id === "demand" ? "Quiet" : `${min}s`}</span><span>{id === "demand" ? "Rush hour" : `${max}s`}</span></div>
  </div>;
}

export function SignalPanel({ settings, snapshot, changeSetting }: { settings: SimulationSettings; snapshot: SimulationSnapshot; changeSetting: (key: keyof SimulationSettings, value: number) => void }) {
  const clearing = snapshot.phase.endsWith("clear");
  const phaseName = clearing ? "Clearing intersection" : `${snapshot.phase.startsWith("ns") ? "North / South" : "East / West"} ${snapshot.phase.endsWith("amber") ? "amber" : "green"}`;
  return <aside className="signal-panel glass" aria-labelledby="signal-title">
    <div className="panel-heading"><div><span className="eyebrow">INTERSECTION 01</span><h2 id="signal-title">Signal control</h2></div><Icon name="sliders" size={20} /></div>
    <div className="signal-status">
      <div className="signal-row"><span className="axis-label"><Icon name="arrow" size={14} /> N / S</span><SignalDots active={snapshot.nsSignal} /><span className={`signal-word ${snapshot.nsSignal}`}>{snapshot.nsSignal}</span></div>
      <div className="signal-row"><span className="axis-label"><Icon name="arrow" size={14} style={{ transform: "rotate(90deg)" }} /> E / W</span><SignalDots active={snapshot.ewSignal} /><span className={`signal-word ${snapshot.ewSignal}`}>{snapshot.ewSignal}</span></div>
      <div className="phase-label"><span>{phaseName}</span><span>{clearing && snapshot.remaining <= 0 ? "Clearing…" : `${Math.ceil(snapshot.remaining)}s`}</span></div>
      <div className="phase-track"><span className={snapshot.phase.endsWith("amber") ? "amber" : clearing ? "red" : ""} style={{ width: `${(1 - snapshot.progress) * 100}%` }} /></div>
    </div>
    <div className="timing-controls">
      <div className="section-label">GREEN DURATION <span>LIVE</span></div>
      <Slider id="ns-green" label="North / South" value={settings.nsGreen} min={6} max={45} display={`${settings.nsGreen} s`} onChange={value => changeSetting("nsGreen", value)} />
      <Slider id="ew-green" label="East / West" value={settings.ewGreen} min={6} max={45} display={`${settings.ewGreen} s`} onChange={value => changeSetting("ewGreen", value)} />
    </div>
    <div className="demand-controls"><Slider id="demand" label="Traffic demand" value={settings.demand} min={0.3} max={2.5} step={0.1} display={`${settings.demand.toFixed(1)}×`} onChange={value => changeSetting("demand", value)} /></div>
    <div className="panel-note"><Icon name="info" size={14} /><p>Every second changes the flow.<br />Adjust the balance. Watch the city respond.</p></div>
  </aside>;
}
