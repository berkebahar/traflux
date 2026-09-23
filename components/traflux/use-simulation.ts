"use client";

import { useEffect, useRef, useState } from "react";
import { CityRenderer } from "@/lib/rendering/city";
import { createSimulation, DEFAULT_SETTINGS, FIXED_STEP, getSnapshot, stepSimulation } from "@/lib/simulation/engine";
import type { SimulationSettings, SimulationSnapshot, SimulationState } from "@/lib/simulation/types";

const INITIAL_SNAPSHOT = getSnapshot(createSimulation());

export function useSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimulationState | null>(null);
  const playbackRef = useRef({ paused: false, speed: 1 });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [settings, setSettings] = useState<SimulationSettings>({ ...DEFAULT_SETTINGS });
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(INITIAL_SNAPSHOT);
  const [canvasError, setCanvasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!canvas.getContext("2d")) {
      const id = requestAnimationFrame(() => setCanvasError(true));
      return () => cancelAnimationFrame(id);
    }
    stateRef.current = createSimulation();
    const renderer = new CityRenderer(canvas);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    const onMotionChange = () => { reducedMotion = media.matches; };
    media.addEventListener("change", onMotionChange);
    let accumulator = 0;
    let previousTime = 0;
    let lastPublish = 0;
    let frame = 0;
    const resizeObserver = new ResizeObserver(([entry]) => {
      renderer.resize(entry.contentRect.width, entry.contentRect.height);
      renderer.render(stateRef.current!, 1, reducedMotion);
    });
    resizeObserver.observe(canvas);
    const onVisibility = () => { previousTime = 0; accumulator = 0; };
    document.addEventListener("visibilitychange", onVisibility);
    const animate = (now: number) => {
      const state = stateRef.current!;
      const elapsed = previousTime ? Math.min((now - previousTime) / 1000, 0.1) : 0;
      previousTime = now;
      const playback = playbackRef.current;
      if (!document.hidden) {
        if (!playback.paused) {
          accumulator += elapsed * playback.speed;
          // Bound catch-up work to 24 fixed steps per animation frame.
          let steps = 0;
          while (accumulator >= FIXED_STEP && steps < 24) {
            stepSimulation(state);
            accumulator -= FIXED_STEP;
            steps++;
          }
          accumulator = Math.min(accumulator, FIXED_STEP);
        } else accumulator = 0;
        renderer.render(state, playback.paused ? 1 : accumulator / FIXED_STEP, reducedMotion);
        if (now - lastPublish >= 120) { setSnapshot(getSnapshot(state)); lastPublish = now; }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); resizeObserver.disconnect();
      media.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      stateRef.current = null;
    };
  }, []);

  function togglePaused() {
    const next = !playbackRef.current.paused;
    playbackRef.current.paused = next; setPaused(next);
  }
  function changeSpeed(next: number) { playbackRef.current.speed = next; setSpeed(next); }
  function changeSetting(key: keyof SimulationSettings, value: number) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    if (stateRef.current) stateRef.current.settings = { ...next };
  }
  function reset() {
    const next = createSimulation(settings);
    stateRef.current = next; setSnapshot(getSnapshot(next));
  }
  return { canvasRef, snapshot, settings, paused, speed, canvasError, togglePaused, changeSpeed, changeSetting, reset };
}
