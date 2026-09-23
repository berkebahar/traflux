"use client";

import { useEffect, useRef, useState } from "react";
import { CityRenderer } from "@/lib/rendering/city";
import {
  accelerateIncidentClearance,
  applyGreenPriority,
  createChallengeSimulation,
  createSimulation,
  DEFAULT_SETTINGS,
  FIXED_STEP,
  getSnapshot,
  setTimeOfDay,
  setWeather,
  stepSimulation,
  triggerEmergency,
  triggerSandboxIncident,
} from "@/lib/simulation/engine";
import type {
  Axis,
  Direction,
  EmergencyType,
  GameMode,
  ImplementedIncidentKind,
  SimulationSettings,
  SimulationSnapshot,
  SimulationState,
  TimeOfDay,
  VehicleMix,
  WeatherMode,
} from "@/lib/simulation/types";

const INITIAL_STATE = createSimulation();
const INITIAL_SNAPSHOT = getSnapshot(INITIAL_STATE);

function cloneSettings(settings: SimulationSettings): SimulationSettings {
  return {
    ...settings,
    directionalDemand: { ...settings.directionalDemand },
    vehicleMix: { ...settings.vehicleMix },
  };
}

export function useSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const playbackRef = useRef({ paused: false, speed: 1 });

  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<GameMode>("sandbox");
  const [settings, setSettings] = useState<SimulationSettings>(cloneSettings(DEFAULT_SETTINGS));
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(INITIAL_SNAPSHOT);
  const [canvasError, setCanvasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!canvas.getContext("2d")) {
      const id = requestAnimationFrame(() => setCanvasError(true));
      return () => cancelAnimationFrame(id);
    }

    stateRef.current = createSimulation(settings);
    const renderer = new CityRenderer(canvas);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    const onMotionChange = () => { reducedMotion = media.matches; };
    media.addEventListener("change", onMotionChange);

    let accumulator = 0;
    let previousTime = 0;
    let lastPublish = 0;
    let frame = 0;

    const publish = (state: SimulationState) => {
      setSnapshot(getSnapshot(state));
      setMode(state.mode);
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!stateRef.current) return;
      renderer.resize(entry.contentRect.width, entry.contentRect.height);
      renderer.render(stateRef.current, 1, reducedMotion);
    });
    resizeObserver.observe(canvas);

    const onVisibility = () => {
      previousTime = 0;
      accumulator = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const animate = (now: number) => {
      const state = stateRef.current;
      if (!state) return;
      const elapsed = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
      previousTime = now;
      const playback = playbackRef.current;

      if (!document.hidden) {
        if (!playback.paused) {
          accumulator += elapsed * playback.speed;
          let steps = 0;
          while (accumulator >= FIXED_STEP && steps < 24) {
            stepSimulation(state);
            accumulator -= FIXED_STEP;
            steps++;
          }
          accumulator = Math.min(accumulator, FIXED_STEP);
        } else {
          accumulator = 0;
        }

        renderer.render(state, playback.paused ? 1 : accumulator / FIXED_STEP, reducedMotion);
        if (now - lastPublish >= 120) {
          publish(state);
          lastPublish = now;
        }
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      stateRef.current = null;
    };
    // The engine owns mutable simulation state; React settings are deliberately
    // not dependencies of the animation-loop setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function publishNow() {
    if (stateRef.current) setSnapshot(getSnapshot(stateRef.current));
  }

  function togglePaused() {
    const next = !playbackRef.current.paused;
    playbackRef.current.paused = next;
    setPaused(next);
  }

  function changeSpeed(next: number) {
    playbackRef.current.speed = next;
    setSpeed(next);
  }

  function changeSetting(key: "nsGreen" | "ewGreen" | "demand", value: number) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings[key] = value;
  }

  function changeDirectionalDemand(direction: Direction, value: number) {
    const next = {
      ...settings,
      directionalDemand: { ...settings.directionalDemand, [direction]: value },
    };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings.directionalDemand[direction] = value;
  }

  function changeVehicleMix(key: keyof Pick<VehicleMix, "heavy" | "motorcycle" | "emergency">, value: number) {
    const next = {
      ...settings,
      vehicleMix: { ...settings.vehicleMix, [key]: value },
    };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings.vehicleMix[key] = value;
  }

  function setDemandMode(modeValue: SimulationSettings["demandMode"]) {
    const next = { ...settings, demandMode: modeValue };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings.demandMode = modeValue;
  }

  function setRandomIncidents(value: boolean) {
    const next = { ...settings, randomIncidents: value };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings.randomIncidents = value;
  }

  function setCongestionOverlay(value: boolean) {
    const next = { ...settings, showCongestion: value };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings.showCongestion = value;
  }

  function changeWeather(weather: WeatherMode) {
    if (!stateRef.current) return;
    setWeather(stateRef.current, weather);
    publishNow();
  }

  function changeTime(timeOfDay: TimeOfDay) {
    if (!stateRef.current) return;
    setTimeOfDay(stateRef.current, timeOfDay);
    publishNow();
  }

  function triggerEvent(kind: ImplementedIncidentKind, direction?: Direction) {
    if (!stateRef.current) return;
    triggerSandboxIncident(stateRef.current, kind, direction);
    publishNow();
  }

  function dispatch(type: EmergencyType = "ambulance", origin?: Direction) {
    if (!stateRef.current) return;
    triggerEmergency(stateRef.current, type, origin);
    publishNow();
  }

  function requestPriority(axis: Axis) {
    if (!stateRef.current) return false;
    const result = applyGreenPriority(stateRef.current, axis);
    publishNow();
    return result;
  }

  function clearIncident(incidentId: number) {
    if (!stateRef.current) return false;
    const result = accelerateIncidentClearance(stateRef.current, incidentId);
    publishNow();
    return result;
  }

  function startChallenge(challengeId: string) {
    const next = createChallengeSimulation(challengeId);
    stateRef.current = next;
    const nextSettings = cloneSettings(next.settings);
    setSettings(nextSettings);
    setMode("challenge");
    setSnapshot(getSnapshot(next));
    playbackRef.current.paused = false;
    setPaused(false);
  }

  function openSandbox() {
    const previous = stateRef.current;
    const next = createSimulation(settings);
    if (previous) {
      next.environment.weather = previous.environment.weather;
      next.environment.timeOfDay = previous.environment.timeOfDay;
    }
    stateRef.current = next;
    setMode("sandbox");
    setSnapshot(getSnapshot(next));
    playbackRef.current.paused = false;
    setPaused(false);
  }

  function reset() {
    const current = stateRef.current;
    if (current?.mode === "challenge" && current.challenge) {
      startChallenge(current.challenge.id);
      return;
    }

    const next = createSimulation(settings);
    if (current) {
      next.environment.weather = current.environment.weather;
      next.environment.timeOfDay = current.environment.timeOfDay;
    }
    stateRef.current = next;
    setSnapshot(getSnapshot(next));
  }

  return {
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
    startChallenge,
    openSandbox,
    reset,
  };
}
