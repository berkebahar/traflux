import { LANES, signalFor, vehiclePoint } from "../simulation/engine";
import type { SimulationState } from "../simulation/types";

type Context = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function rect(ctx: Context, x: number, y: number, w: number, h: number, color: string, radius = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function line(ctx: Context, x: number, y: number, ex: number, ey: number, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
}

function glow(ctx: Context, x: number, y: number, radius: number, color: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function tree(ctx: Context, x: number, y: number, size: number, seed: number) {
  glow(ctx, x + 4, y + 6, size * 1.3, "#00000090");
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4 + seed;
    const dx = Math.cos(angle) * size * 0.32, dy = Math.sin(angle) * size * 0.32;
    ctx.beginPath(); ctx.arc(x + dx, y + dy, size * (0.5 + i * 0.025), 0, TAU);
    ctx.fillStyle = ["#172b26", "#1c322b", "#20382f", "#263c32"][i % 4]; ctx.fill();
  }
  glow(ctx, x - size * 0.3, y - size * 0.4, size, "#669c5815");
}

function building(ctx: Context, x: number, y: number, w: number, h: number, warm: boolean) {
  rect(ctx, x + 10, y + 12, w, h, "#00000060", 4);
  rect(ctx, x - 3, y - 3, w + 6, h + 6, "#11191c", 3);
  const roof = ctx.createLinearGradient(x, y, x + w, y + h);
  roof.addColorStop(0, "#293237"); roof.addColorStop(1, "#1b2328");
  ctx.fillStyle = roof; ctx.fillRect(x, y, w, h);
  line(ctx, x, y, x + w, y, "#52606470", 2);
  line(ctx, x, y, x, y + h, "#4b595d60", 2);
  rect(ctx, x + 9, y + 9, w - 18, h - 18, "#141d2150", 2);
  ctx.strokeStyle = "#505e631c"; ctx.lineWidth = 1; ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
  for (let yy = y + 20; yy < y + h - 16; yy += 30) {
    line(ctx, x + 15, yy, x + w - 15, yy, "#66797a0c");
  }
  for (let xx = x + 15; xx < x + w - 12; xx += 18) {
    const color = warm ? "#ccb282" : "#80b4b6";
    rect(ctx, xx, y + h - 1, 8, 2, color + "9a");
    glow(ctx, xx + 4, y + h + 3, 13, color + "16");
  }
  for (let yy = y + 18; yy < y + h - 12; yy += 22) {
    rect(ctx, x - 1, yy, 2, 9, warm ? "#bca98270" : "#86b5b660");
  }
  // Rooftop plant and ventilation details.
  for (let i = 0; i < Math.floor(w / 65); i++) {
    rect(ctx, x + 25 + i * 48, y + 28, 25, 17, "#10181c", 2);
    rect(ctx, x + 24 + i * 48, y + 26, 25, 17, "#354045", 2);
    ctx.strokeStyle = "#84928c30"; ctx.beginPath(); ctx.arc(x + 36 + i * 48, y + 34, 5, 0, TAU); ctx.stroke();
    line(ctx, x + 24 + i * 48, y + 29, x + 48 + i * 48, y + 29, "#64717240");
  }
  rect(ctx, x + w - 40, y + h - 39, 21, 22, "#121b1f", 2);
  rect(ctx, x + w - 42, y + h - 42, 21, 22, "#303b3e", 2);
}

function streetLamp(ctx: Context, x: number, y: number, angle: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  glow(ctx, 0, 15, 63, "#ebd6a211");
  glow(ctx, 0, 11, 27, "#ebd6a216");
  line(ctx, 0, -5, 0, 13, "#0b1014", 3);
  rect(ctx, -3, 9, 6, 3, "#e1dcc0", 1);
  ctx.restore();
}

function arrow(ctx: Context, x: number, y: number) {
  line(ctx, x, y + 12, x, y - 10, "#b9c2b244", 2);
  line(ctx, x, y - 10, x - 5, y - 4, "#b9c2b244", 2);
  line(ctx, x, y - 10, x + 5, y - 4, "#b9c2b244", 2);
}

function drawCity(ctx: Context) {
  rect(ctx, -1800, -1800, 3600, 3600, "#101a1b");
  // Sidewalks wrap the four city blocks.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ctx.save(); ctx.scale(sx, sy);
    rect(ctx, 78, 78, 850, 850, "#353c3b", 20);
    rect(ctx, 88, 88, 850, 850, "#252e2d", 14);
    rect(ctx, 121, 121, 800, 800, "#162220", 4);
    for (let i = 130; i < 850; i += 28) {
      line(ctx, 81, i, 120, i, "#747e6a16");
      line(ctx, i, 81, i, 120, "#747e6a16");
    }
    // Recessed sidewalk edges.
    line(ctx, 81, 107, 81, 850, "#aab9a52a");
    line(ctx, 107, 81, 850, 81, "#aab9a52a");
    for (let i = 176; i < 760; i += 142) {
      streetLamp(ctx, 86, i, Math.PI / 2);
      streetLamp(ctx, i, 86, Math.PI);
      tree(ctx, 106, i + 54, 12, i);
      tree(ctx, i + 54, 106, 12, i + 1);
    }
    ctx.restore();
  }
  // Continuous asphalt surface, slightly lighter than the city around it.
  rect(ctx, -78, -1500, 156, 3000, "#282e30");
  rect(ctx, -1500, -78, 3000, 156, "#282e30");
  const pool = ctx.createRadialGradient(0, 0, 12, 0, 0, 420);
  pool.addColorStop(0, "#879d9710"); pool.addColorStop(1, "transparent");
  ctx.fillStyle = pool; ctx.fillRect(-420, -420, 840, 840);
  // A deterministic asphalt grain, cached with the rest of the city.
  for (let i = 0; i < 15000; i++) {
    const x = ((i * 7919) % 2800) - 1400, y = ((i * 104729) % 2800) - 1400;
    if (Math.abs(x) < 78 || Math.abs(y) < 78) rect(ctx, x, y, 1, 1, i % 2 ? "#cad8d60b" : "#00000012");
  }
  for (let side = 0; side < 4; side++) {
    ctx.save(); ctx.rotate(side * Math.PI / 2);
    for (const x of [-3, 3]) line(ctx, x, 116, x, 1400, "#c9ba7838", 1.2);
    for (const x of [-34, 34]) {
      ctx.setLineDash([17, 24]); line(ctx, x, 142, x, 1400, "#ced3c934"); ctx.setLineDash([]);
    }
    line(ctx, -68, 125, -68, 1400, "#b6beb034");
    line(ctx, 68, 125, 68, 1400, "#b6beb034");
    // Zebra crossings and the incoming stop line.
    for (let x = -62; x < 65; x += 12) rect(ctx, x, 90, 6, 13, "#d5d5bb65", 0.5);
    rect(ctx, 9, 109, 53, 3, "#dedec181", 0.5);
    arrow(ctx, 20, 164); arrow(ctx, 48, 164);
    for (let i = 142; i < 650; i += 46) {
      rect(ctx, -76, i, 3, 18, "#87918122");
      rect(ctx, 73, i, 3, 18, "#87918122");
    }
    ctx.restore();
  }
  building(ctx, -442, -370, 252, 173, true);
  building(ctx, -425, -570, 227, 154, false);
  building(ctx, -646, -360, 155, 210, false);
  building(ctx, 191, 180, 227, 163, false);
  building(ctx, 462, 165, 210, 255, true);
  building(ctx, 195, 396, 224, 180, true);
  building(ctx, 248, -529, 260, 159, false);
  building(ctx, 525, -320, 194, 189, true);
  building(ctx, -613, 216, 183, 255, true);
  building(ctx, -395, 441, 238, 175, false);
  // Pocket park: paths, low planters, seating, and a softly lit circular fountain.
  rect(ctx, -395, 139, 252, 255, "#1b2a23", 9);
  rect(ctx, -284, 139, 17, 255, "#46504455");
  rect(ctx, -395, 252, 252, 17, "#46504455");
  for (let i = 0; i < 12; i++) {
    const x = -363 + (i % 4) * 62, y = 172 + Math.floor(i / 4) * 91;
    if (i !== 5 && i !== 6) tree(ctx, x, y, 19 + i % 5, i);
  }
  ctx.beginPath(); ctx.arc(-275, 261, 37, 0, TAU); ctx.fillStyle = "#485451"; ctx.fill();
  ctx.beginPath(); ctx.arc(-275, 261, 31, 0, TAU); ctx.fillStyle = "#1e3639"; ctx.fill();
  ctx.strokeStyle = "#98c6bf38"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-275, 261, 23, 0, TAU); ctx.stroke();
  glow(ctx, -275, 261, 43, "#8bccba19");
  ctx.beginPath(); ctx.arc(-275, 261, 5, 0, TAU); ctx.fillStyle = "#a0c2b8"; ctx.fill();
  for (const y of [215, 300]) rect(ctx, -246, y, 22, 5, "#81765a", 1);
  // Northeast plaza with a small pavilion and parallel planting beds.
  rect(ctx, 144, -317, 311, 172, "#303a35", 5);
  for (let x = 150; x < 456; x += 20) line(ctx, x, -313, x, -151, "#b1b39a0d");
  for (let y = -307; y < -148; y += 20) line(ctx, 149, y, 451, y, "#b1b39a0d");
  building(ctx, 274, -290, 144, 91, true);
  for (let i = 0; i < 4; i++) {
    tree(ctx, 169 + i * 78, -163, 14, i);
    if (i < 3) tree(ctx, 164, -215 - i * 42, 13, i);
  }
  // A few parked vehicles beside the northwest block.
  for (let i = 0; i < 7; i++) {
    line(ctx, -430 + i * 34, -172, -430 + i * 34, -137, "#a1a79530");
    rect(ctx, -423 + i * 34, -165, 13, 23, ["#455053", "#6e7670", "#927f64"][i % 3], 3);
    rect(ctx, -421 + i * 34, -159, 9, 11, "#1a2528", 2);
  }
  ctx.textAlign = "center"; ctx.font = "9px ui-monospace, monospace";
  ctx.fillStyle = "#a6b6a16b"; ctx.fillText("EVERGREEN SQUARE", -275, 419);
  ctx.fillStyle = "#b3bfad45"; ctx.fillText("CIVIC PLAZA", 304, -130);
  ctx.save(); ctx.translate(-88, -290); ctx.rotate(-Math.PI / 2);
  ctx.font = "8px ui-monospace, monospace"; ctx.fillStyle = "#c2cbb455"; ctx.fillText("NORTH AVENUE", 0, 0); ctx.restore();
  ctx.fillText("EAST AVENUE", 319, 72);
}

function carSprite(color: string, braking: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 72;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2); ctx.translate(21, 18);
  // Headlight pools point forward, with a much softer bloom than the lamps.
  const beam = ctx.createLinearGradient(9, 0, 40, 0);
  beam.addColorStop(0, "#e5f5dd24"); beam.addColorStop(1, "#e5f5dd00");
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(39, -12); ctx.lineTo(39, 12); ctx.lineTo(9, 4); ctx.fill();
  rect(ctx, -11, -5, 24, 12, "#00000080", 3);
  rect(ctx, -10.5, -5.5, 21, 11, color, 3);
  rect(ctx, -6, -4, 10, 8, "#142126", 2);
  rect(ctx, -3.5, -3.7, 5, 7.4, color, 1);
  line(ctx, -8, -4.6, 6, -4.6, "#ffffff40", 0.7);
  rect(ctx, 7, -4, 2, 8, color, 1);
  for (const y of [-3.7, 2.2]) {
    rect(ctx, 9, y, 1.5, 1.7, "#efffdf", 0.4);
    glow(ctx, -10.5, y + 0.6, braking ? 9 : 4, braking ? "#ff493967" : "#ff49392b");
    rect(ctx, -11, y, 1.5, 1.7, braking ? "#ff6c52" : "#cb493e", 0.3);
  }
  return canvas;
}

/** Static city and vehicle sprites are rasterized once, keeping each frame inexpensive. */
export class CityRenderer {
  private context: Context;
  private backdrop = document.createElement("canvas");
  private sprites = new Map<string, HTMLCanvasElement>();
  private width = 0;
  private height = 0;
  private scale = 1;
  private centerX = 0;
  private centerY = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d", { alpha: false })!;
  }

  resize(width: number, height: number) {
    this.width = width; this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.backdrop.width = Math.round(width * this.dpr);
    this.canvas.height = this.backdrop.height = Math.round(height * this.dpr);
    const reserve = width > 900 ? 290 : 0;
    this.scale = Math.max(Math.min((width - reserve) / 980, height / 810), (width - reserve) / 1240, height / 1240);
    this.centerX = (width - reserve) / 2;
    this.centerY = height * 0.51;
    const ctx = this.backdrop.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#111a1b"; ctx.fillRect(0, 0, width, height);
    ctx.translate(this.centerX, this.centerY); ctx.scale(this.scale, this.scale);
    drawCity(ctx);
  }

  render(state: SimulationState, interpolation: number, reducedMotion: boolean) {
    const ctx = this.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.backdrop, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save(); ctx.translate(this.centerX, this.centerY); ctx.scale(this.scale, this.scale);
    for (const vehicle of state.vehicles) {
      const lane = LANES[vehicle.laneId];
      const p = vehicle.previousPosition + (vehicle.position - vehicle.previousPosition) * interpolation;
      const point = vehiclePoint(lane, p);
      const key = vehicle.color + vehicle.braking;
      let sprite = this.sprites.get(key);
      if (!sprite) { sprite = carSprite(vehicle.color, vehicle.braking); this.sprites.set(key, sprite); }
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(lane.angle); ctx.scale(vehicle.length / 21, 1);
      ctx.drawImage(sprite, -21, -18, 64, 36); ctx.restore();
    }
    for (let side = 0; side < 4; side++) {
      const axis = side % 2 === 0 ? "ns" : "ew";
      const active = signalFor(state, axis);
      ctx.save(); ctx.rotate(side * Math.PI / 2);
      line(ctx, 76, 119, 50, 119, "#0e1718", 3);
      rect(ctx, 63, 111, 10, 26, "#080e10", 3);
      const colors = { red: "#ff6553", amber: "#ffc568", green: "#a6e6b4" };
      for (const [i, color] of (["red", "amber", "green"] as const).entries()) {
        const y = 116 + i * 8;
        if (active === color) glow(ctx, 68, y, 22, colors[color] + "48");
        ctx.beginPath(); ctx.arc(68, y, 2.6, 0, TAU);
        ctx.fillStyle = active === color ? colors[color] : "#24302b"; ctx.fill();
      }
      glow(ctx, 47, 113, 46, colors[active] + "0e");
      ctx.restore();
    }
    if (!reducedMotion) {
      for (let i = 0; i < 28; i++) {
        const x = ((i * 137 + state.time * (1 + i % 3)) % 1200) - 600;
        const y = ((i * 233 + state.time * 0.8) % 1000) - 500;
        ctx.fillStyle = `rgba(215,226,206,${0.08 + Math.sin(state.time * 0.2 + i) * 0.035})`;
        ctx.beginPath(); ctx.arc(x, y, 0.65 + (i % 3) * 0.2, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    // Gentle lens falloff keeps the eye on the intersection.
    const vignette = ctx.createRadialGradient(this.centerX, this.centerY, this.height * 0.15, this.centerX, this.centerY, Math.max(this.width, this.height) * 0.75);
    vignette.addColorStop(0, "#070e1000"); vignette.addColorStop(1, "#070e10bc");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, this.width, this.height);
  }
}
