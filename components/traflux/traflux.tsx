"use client";

import { useState } from "react";
import { CHALLENGES } from "@/lib/simulation/challenges";
import { TIMES, WEATHER } from "@/lib/simulation/environment";
import { ChallengeBrowser, ChallengeHUD, ChallengeResultOverlay } from "./challenge-overlay";
import { ControlDock } from "./control-dock";
import { EventFeed } from "./event-feed";
import { BrandMark, Icon } from "./icons";
import { Metrics } from "./metrics";
import { SignalPanel } from "./signal-panel";
import { useSimulation } from "./use-simulation";

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60).toString().padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}

export function Traflux() {
  const {
    canvasRef,
    snapshot,
    settings,
    mode,
    paused,
    speed,
    canvasError,
    togglePaused,
    changeSpeed,
    changeSetting,
    changeDirectionalDemand,
    changeVehicleMix,
    setDemandMode,
    setRandomIncidents,
    setCongestionOverlay,
    changeWeather,
    changeTime,
    triggerEvent,
    dispatch,
    requestPriority,
    clearIncident,
    startChallenge: startChallengeRun,
    openSandbox: openSandboxRun,
    reset,
  } = useSimulation();
  const [challengeBrowserOpen, setChallengeBrowserOpen] = useState(false);

  const weather = WEATHER[snapshot.environment.weather];
  const time = TIMES[snapshot.environment.timeOfDay];

  function startChallenge(id: string) {
    startChallengeRun(id);
    setChallengeBrowserOpen(false);
  }

  function retryChallenge() {
    if (snapshot.challenge) startChallengeRun(snapshot.challenge.id);
  }

  function nextChallenge() {
    if (!snapshot.challenge) return;
    const index = CHALLENGES.findIndex((challenge) => challenge.id === snapshot.challenge?.id);
    if (index >= 0 && index + 1 < CHALLENGES.length) startChallengeRun(CHALLENGES[index + 1].id);
  }

  function openSandbox() {
    setChallengeBrowserOpen(false);
    openSandboxRun();
  }

  return <main className="traflux">
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><BrandMark /></span>
        <div><h1>traflux<span className="brand-period">.</span></h1><p>Control the flow.</p></div>
      </div>

      <div className="mode-label">
        <span className="mode-dot" />
        {mode === "challenge" ? "CHALLENGE OPERATIONS" : "INTERSECTION SANDBOX"}
        <span className="version-label">V 0.2</span>
      </div>

      <div className="environment">
        <Icon name="moon" size={17} />
        <span>{weather.label} · {time.label}</span>
        <span className="environment-divider" />
        <span className="environment-time">{time.clock}</span>
      </div>
    </header>

    <div className="simulation-layout">
      <div className="scene">
        <canvas
          ref={canvasRef}
          className="city-canvas"
          role="img"
          aria-label="Live top-down Traflux traffic simulation with vehicles, signals, weather, incidents, and challenge scenarios."
        />
        {canvasError && <div className="canvas-fallback">This simulation needs a browser with Canvas 2D support.</div>}

        <div className="scene-top-shade" />
        <div className="location-label">
          <span className="eyebrow">{mode === "challenge" ? "CITY OPERATIONS / LIVE" : "THE CITY IS IN YOUR HANDS"}</span>
          <h2>{mode === "challenge" ? <>Pressure changes.<br /><span>Flow adapts.</span></> : <>A little order.<br /><span>A lot of possibility.</span></>}</h2>
          <div className="location-meta"><Icon name="cross" size={14} /> North Avenue <span>×</span> East Avenue</div>
        </div>

        <div className="view-label"><span className="view-cross">+</span> TOP-DOWN / LIVE VIEW</div>
        <div className="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 38 44" width="30" height="35"><path d="m19 4 10 31-10-6-10 6Z" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M19 4v25L9 35Z" fill="currentColor" opacity=".45" /></svg></div>
        <div className="scene-caption"><span className="caption-line" /> ONE INTERSECTION. INFINITE RHYTHMS.</div>

        <EventFeed events={snapshot.events} />

        <div className="playback glass">
          <button className={`play-button ${paused ? "is-paused" : ""}`} onClick={togglePaused} aria-label={paused ? "Resume simulation" : "Pause simulation"}>
            <Icon name={paused ? "play" : "pause"} size={16} /><span>{paused ? "Resume" : "Pause"}</span>
          </button>
          <button className="reset-button" onClick={reset} aria-label="Reset current simulation" title="Reset current simulation">
            <Icon name="reset" size={16} />
          </button>
          <span className="playback-divider" />
          <div className="speed-controls" role="group" aria-label="Simulation speed">
            {[1, 2, 4].map((multiplier) => <button key={multiplier} onClick={() => changeSpeed(multiplier)} aria-pressed={speed === multiplier} className={speed === multiplier ? "selected" : ""}>{multiplier}×</button>)}
          </div>
          <span className="playback-divider" />
          <span className="sim-clock" aria-label="Elapsed simulation time">{formatTime(snapshot.time)}</span>
        </div>
      </div>

      <ChallengeHUD snapshot={snapshot} />
      <ControlDock
        settings={settings}
        snapshot={snapshot}
        onShowChallenges={() => setChallengeBrowserOpen(true)}
        onOpenSandbox={openSandbox}
        changeWeather={changeWeather}
        changeTime={changeTime}
        changeDirectionalDemand={changeDirectionalDemand}
        changeVehicleMix={changeVehicleMix}
        setDemandMode={setDemandMode}
        setRandomIncidents={setRandomIncidents}
        setCongestionOverlay={setCongestionOverlay}
        triggerEvent={triggerEvent}
        dispatch={dispatch}
        requestPriority={requestPriority}
        clearIncident={clearIncident}
      />
      <SignalPanel settings={settings} snapshot={snapshot} changeSetting={changeSetting} />

      <div className="bottom-hud">
        <Metrics metrics={snapshot.metrics} />
        <footer className="statusbar">
          <span className={`system-status ${paused ? "paused" : ""}`}><span />{paused ? "SIMULATION PAUSED" : "SIMULATION RUNNING"}</span>
          <span className="footer-hint">{snapshot.incidents.some((incident) => incident.status === "active") ? "Network disruption active. Watch the queue response." : "Find the rhythm. Keep the city moving."}</span>
          <span>{mode === "challenge" ? "CHALLENGE MODE" : "LOCAL SANDBOX"} <span className="footer-slash">/</span> V 0.2</span>
        </footer>
      </div>
    </div>

    <ChallengeBrowser open={challengeBrowserOpen} onClose={() => setChallengeBrowserOpen(false)} onStart={startChallenge} />
    <ChallengeResultOverlay
      snapshot={snapshot}
      onRetry={retryChallenge}
      onNext={nextChallenge}
      onChallenges={() => { openSandboxRun(); setChallengeBrowserOpen(true); }}
      onSandbox={openSandbox}
    />
  </main>;
}
