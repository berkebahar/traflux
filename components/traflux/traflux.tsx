"use client";

import { BrandMark, Icon } from "./icons";
import { Metrics } from "./metrics";
import { SignalPanel } from "./signal-panel";
import { useSimulation } from "./use-simulation";

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60).toString().padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}

export function Traflux() {
  const { canvasRef, snapshot, settings, paused, speed, canvasError, togglePaused, changeSpeed, changeSetting, reset } = useSimulation();
  return <main className="traflux">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><BrandMark /></span><div><h1>traflux<span className="brand-period">.</span></h1><p>Control the flow.</p></div></div>
      <div className="mode-label"><span className="mode-dot" /> INTERSECTION SANDBOX <span className="version-label">PROTOTYPE 01</span></div>
      <div className="environment"><Icon name="moon" size={17} /><span>Clear night</span><span className="environment-divider" /><span className="environment-time">22:00</span></div>
    </header>
    <div className="simulation-layout">
      <div className="scene">
        <canvas ref={canvasRef} className="city-canvas" role="img" aria-label="Live top-down traffic simulation of a four-way city intersection. Vehicles travel straight through two lanes per approach. Traffic lights alternate north/south and east/west, with amber and all-red clearance phases." />
        {canvasError && <div className="canvas-fallback">This simulation needs a browser with Canvas 2D support.</div>}
        <div className="scene-top-shade" />
        <div className="location-label"><span className="eyebrow">THE CITY IS IN YOUR HANDS</span><h2>A little order.<br /><span>A lot of possibility.</span></h2><div className="location-meta"><Icon name="cross" size={14} /> North Avenue <span>×</span> East Avenue</div></div>
        <div className="view-label"><span className="view-cross">+</span> TOP-DOWN / LIVE VIEW</div>
        <div className="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 38 44" width="30" height="35"><path d="m19 4 10 31-10-6-10 6Z" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M19 4v25L9 35Z" fill="currentColor" opacity=".45" /></svg></div>
        <div className="scene-caption"><span className="caption-line" /> ONE INTERSECTION. INFINITE RHYTHMS.</div>
        <div className="playback glass">
          <button className={`play-button ${paused ? "is-paused" : ""}`} onClick={togglePaused} aria-label={paused ? "Resume simulation" : "Pause simulation"}><Icon name={paused ? "play" : "pause"} size={16} /><span>{paused ? "Resume" : "Pause"}</span></button>
          <button className="reset-button" onClick={reset} aria-label="Reset vehicles and metrics" title="Reset vehicles and metrics; keep current settings"><Icon name="reset" size={16} /></button>
          <span className="playback-divider" />
          <div className="speed-controls" role="group" aria-label="Simulation speed">{[1, 2, 4].map(multiplier => <button key={multiplier} onClick={() => changeSpeed(multiplier)} aria-pressed={speed === multiplier} className={speed === multiplier ? "selected" : ""}>{multiplier}×</button>)}</div>
          <span className="playback-divider" /><span className="sim-clock" aria-label="Elapsed simulation time">{formatTime(snapshot.time)}</span>
        </div>
      </div>
      <SignalPanel settings={settings} snapshot={snapshot} changeSetting={changeSetting} />
      <div className="bottom-hud"><Metrics metrics={snapshot.metrics} /><footer className="statusbar"><span className={`system-status ${paused ? "paused" : ""}`}><span />{paused ? "SIMULATION PAUSED" : "SIMULATION RUNNING"}</span><span className="footer-hint">Find the rhythm. Keep the city moving.</span><span>LOCAL SANDBOX <span className="footer-slash">/</span> V 0.1</span></footer></div>
    </div>
  </main>;
}
