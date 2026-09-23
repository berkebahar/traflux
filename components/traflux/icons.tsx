import type { CSSProperties } from "react";

export function Icon({ name, size = 18, style }: { name: "pause" | "play" | "reset" | "sliders" | "moon" | "arrow" | "car" | "clock" | "queue" | "flow" | "info" | "cross"; size?: number; style?: CSSProperties }) {
  const paths = {
    pause: <path d="M8 5v14M16 5v14" strokeWidth="3" />,
    play: <path d="m8 5 11 7-11 7Z" />,
    reset: <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />,
    sliders: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2" /><circle cx="12" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>,
    moon: <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
    arrow: <path d="M12 20V4m-5 5 5-5 5 5" />,
    car: <path d="m5 8 2-4h10l2 4M4 9h16v9H4zM6 18v2m12-2v2M7 13h1m8 0h1" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    queue: <path d="M4 6h16M4 12h12M4 18h8" />,
    flow: <path d="m3 16 6-6 4 4 8-10M15 4h6v6" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7h.01" /></>,
    cross: <path d="M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}

export function BrandMark() {
  return <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M2 12h10V2m10 0v10h10M2 22h10v10m10 0V22h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M17 9v16M9 17h16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" /></svg>;
}
