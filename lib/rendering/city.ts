import { LANES, signalFor, vehiclePoint } from "../simulation/engine";
import type { SimulationState, VehicleType } from "../simulation/types";

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

function vehicleSprite(type: VehicleType, color: string, braking: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.translate(25, 20);

  const motorcycle = type === "motorcycle";
  const bus = type === "bus";
  const truck = type === "truck";
  const vanLike = type === "van" || type === "ambulance";
  const emergency = type === "police" || type === "ambulance" || type === "fire";

  const bodyHalf = motorcycle ? 8 : bus ? 13 : truck ? 12 : vanLike ? 11 : type === "suv" ? 11 : 10.5;
  const bodyWidth = motorcycle ? 4 : bus || truck || type === "fire" ? 6.4 : 5.5;
  const displayColor =
    type === "police" ? "#d8deda" :
    type === "ambulance" ? "#e6e4d8" :
    type === "fire" ? "#a84e43" :
    color;

  const beam = ctx.createLinearGradient(bodyHalf - 1, 0, bodyHalf + 36, 0);
  beam.addColorStop(0, "#e5f5dd20");
  beam.addColorStop(1, "#e5f5dd00");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(bodyHalf - 1, -bodyWidth + 1);
  ctx.lineTo(bodyHalf + 34, -bodyWidth * 2.2);
  ctx.lineTo(bodyHalf + 34, bodyWidth * 2.2);
  ctx.lineTo(bodyHalf - 1, bodyWidth - 1);
  ctx.fill();

  if (motorcycle) {
    rect(ctx, -7, -1.8, 14, 3.6, "#0b1113", 1.5);
    rect(ctx, -4, -1.2, 8, 2.4, displayColor, 1);
    ctx.beginPath(); ctx.arc(-6, 0, 2.2, 0, TAU); ctx.fillStyle = "#080c0e"; ctx.fill();
    ctx.beginPath(); ctx.arc(6, 0, 2.2, 0, TAU); ctx.fill();
    rect(ctx, 4.8, -1.2, 1.2, 2.4, "#efffdf", .4);
    rect(ctx, -6.2, -1.2, 1.1, 2.4, braking ? "#ff6c52" : "#cb493e", .3);
    return canvas;
  }

  rect(ctx, -bodyHalf - .7, -bodyWidth - .7, bodyHalf * 2 + 1.4, bodyWidth * 2 + 1.4, "#00000080", 3);
  rect(ctx, -bodyHalf, -bodyWidth, bodyHalf * 2, bodyWidth * 2, displayColor, 3);

  if (bus) {
    rect(ctx, -8, -bodyWidth + 1, 16, bodyWidth * 2 - 2, "#172327", 2);
    for (let x = -7; x <= 6; x += 4) rect(ctx, x, -bodyWidth + 1.4, 2.5, bodyWidth * 2 - 2.8, "#68808366", .7);
    rect(ctx, -bodyHalf + 2, -bodyWidth + 1, 3, bodyWidth * 2 - 2, "#c8b66b55", 1);
  } else if (truck || type === "fire") {
    rect(ctx, -bodyHalf + 1, -bodyWidth + 1, bodyHalf * 1.05, bodyWidth * 2 - 2, type === "fire" ? "#873c34" : "#596568", 2);
    rect(ctx, 2, -bodyWidth + 1.2, bodyHalf - 3, bodyWidth * 2 - 2.4, "#172327", 2);
    if (type === "fire") {
      for (let x = -7; x < 2; x += 3) line(ctx, x, -bodyWidth + 1, x, bodyWidth - 1, "#d7c8a960", .8);
    }
  } else {
    rect(ctx, -5.5, -bodyWidth + 1.1, 10, bodyWidth * 2 - 2.2, "#142126", 2);
    rect(ctx, -2.7, -bodyWidth + 1.4, 4.5, bodyWidth * 2 - 2.8, displayColor, 1);
  }

  if (type === "police") {
    rect(ctx, -2.5, -bodyWidth - .8, 5, 1.7, "#11191d", .5);
    line(ctx, -bodyHalf + 2, 0, bodyHalf - 2, 0, "#5c728060", 1);
  } else if (type === "ambulance") {
    line(ctx, -bodyHalf + 2, 0, bodyHalf - 2, 0, "#ad5c526f", 1.2);
    rect(ctx, -1.6, -bodyWidth - .8, 3.2, 1.7, "#141a1c", .5);
  }

  line(ctx, -bodyHalf + 2, -bodyWidth + .6, bodyHalf - 4, -bodyWidth + .6, "#ffffff35", .6);
  for (const y of [-bodyWidth + 1.4, bodyWidth - 2.8]) {
    rect(ctx, bodyHalf - 1.8, y, 1.4, 1.5, "#efffdf", .4);
    glow(ctx, -bodyHalf - .2, y + .5, braking ? 8 : 3.5, braking ? "#ff49395f" : "#ff493925");
    rect(ctx, -bodyHalf - .2, y, 1.4, 1.5, braking ? "#ff6c52" : "#cb493e", .3);
  }

  if (emergency) rect(ctx, -1.8, -bodyWidth - 1, 3.6, 1.4, "#0b1114", .5);
  return canvas;
}

function drawCongestionIndicators(ctx: Context, state: SimulationState) {
  if (!state.settings.showCongestion) return;
  for (const lane of LANES) {
    const queued = state.vehicles.filter((vehicle) => vehicle.laneId === lane.id && vehicle.speed < 2 && vehicle.position < -100).length;
    if (!queued) continue;
    const point = vehiclePoint(lane, -145);
    const strength = Math.min(1, queued / 8);
    const color = strength > .65 ? "#e06f5b" : strength > .3 ? "#d4b36a" : "#a9d494";
    glow(ctx, point.x, point.y, 18 + queued * 1.4, color + "20");
    ctx.strokeStyle = color + "80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7 + queued * .35, 0, TAU);
    ctx.stroke();
  }
}

function drawWorldEnvironment(ctx: Context, state: SimulationState, reducedMotion: boolean) {
  const visuals = state.environment.visuals;

  if (visuals.wetness > .05) {
    ctx.globalAlpha = visuals.wetness * .18;
    for (let i = -620; i <= 620; i += 85) {
      line(ctx, -55, i, -24, i + 18, "#b8c8c6", 1);
      line(ctx, i, 31, i + 24, 43, "#b8c8c6", 1);
    }
    ctx.globalAlpha = 1;
  }

  if (visuals.snow > .05) {
    ctx.globalAlpha = visuals.snow * .38;
    line(ctx, -77, -700, -77, 700, "#dce5df", 4);
    line(ctx, 77, -700, 77, 700, "#dce5df", 4);
    line(ctx, -700, -77, 700, -77, "#dce5df", 4);
    line(ctx, -700, 77, 700, 77, "#dce5df", 4);
    ctx.globalAlpha = 1;
  }

  drawCongestionIndicators(ctx, state);

  for (const incident of state.incidents) {
    if (incident.status !== "active" || incident.laneId === null) continue;
    const point = vehiclePoint(LANES[incident.laneId], incident.position);
    const pulse = reducedMotion ? 1 : .75 + Math.sin(state.time * 4) * .2;
    ctx.strokeStyle = incident.kind === "collision" ? `rgba(235,132,104,${pulse})` : `rgba(224,188,105,${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 19 + pulse * 4, 0, TAU);
    ctx.stroke();
  }
}

function drawScreenWeather(ctx: Context, state: SimulationState, width: number, height: number, dpr: number, reducedMotion: boolean) {
  const visuals = state.environment.visuals;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (visuals.daylight > .02) {
    ctx.fillStyle = `rgba(151,166,148,${visuals.daylight * .13})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (visuals.cold > .05) {
    ctx.fillStyle = `rgba(132,160,171,${visuals.cold * .07})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (!reducedMotion && visuals.rain > .03) {
    const count = Math.round(45 + visuals.rain * 95);
    ctx.strokeStyle = `rgba(191,211,214,${.12 + visuals.rain * .18})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const x = ((i * 83 + state.time * (180 + (i % 7) * 12)) % (width + 120)) - 60;
      const y = ((i * 137 + state.time * (420 + (i % 5) * 18)) % (height + 100)) - 50;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8 - visuals.rain * 8, y + 20 + visuals.rain * 15);
      ctx.stroke();
    }
  }

  if (!reducedMotion && visuals.snow > .03) {
    const count = Math.round(35 + visuals.snow * 70);
    ctx.fillStyle = `rgba(232,239,235,${.28 + visuals.snow * .28})`;
    for (let i = 0; i < count; i++) {
      const x = ((i * 109 + state.time * (16 + i % 4)) % (width + 60)) - 30;
      const y = ((i * 71 + state.time * (28 + i % 5)) % (height + 60)) - 30;
      ctx.beginPath();
      ctx.arc(x, y, .8 + (i % 3) * .45, 0, TAU);
      ctx.fill();
    }
  }

  if (visuals.fog > .03) {
    const fog = ctx.createLinearGradient(0, height * .15, width, height * .85);
    fog.addColorStop(0, `rgba(174,190,185,${visuals.fog * .11})`);
    fog.addColorStop(.45, `rgba(151,171,168,${visuals.fog * .2})`);
    fog.addColorStop(1, `rgba(190,200,193,${visuals.fog * .1})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, height);
  }

  if (!reducedMotion && visuals.rain > .8) {
    const lightning = Math.max(0, Math.sin(state.time * .51) - .992) * 4.5;
    if (lightning > 0) {
      ctx.fillStyle = `rgba(218,229,226,${Math.min(.16, lightning)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  ctx.restore();
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
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(this.scale, this.scale);

    drawWorldEnvironment(ctx, state, reducedMotion);

    for (const vehicle of state.vehicles) {
      const lane = LANES[vehicle.laneId];
      const p = vehicle.previousPosition + (vehicle.position - vehicle.previousPosition) * interpolation;
      const point = vehiclePoint(lane, p);
      const incident = vehicle.incidentId === null ? null : state.incidents.find((item) => item.id === vehicle.incidentId && item.status === "active");
      const collisionAge = incident?.kind === "collision" ? state.time - incident.startedAt : 99;
      const collisionJolt = collisionAge < 1.1 && !reducedMotion
        ? Math.sin(collisionAge * 16) * .075 * Math.max(0, 1 - collisionAge / 1.1)
        : 0;

      const key = vehicle.type + ":" + vehicle.color + ":" + vehicle.braking;
      let sprite = this.sprites.get(key);
      if (!sprite) {
        sprite = vehicleSprite(vehicle.type, vehicle.color, vehicle.braking);
        this.sprites.set(key, sprite);
      }

      if (state.environment.visuals.rain > .2 && vehicle.speed > 22 && !reducedMotion) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(lane.angle);
        ctx.strokeStyle = `rgba(180,202,203,${state.environment.visuals.rain * .18})`;
        ctx.lineWidth = 1;
        for (let spray = -1; spray <= 1; spray += 2) {
          ctx.beginPath();
          ctx.moveTo(-vehicle.length * .45, spray * vehicle.width * .3);
          ctx.lineTo(-vehicle.length * .75 - (state.time * 20 % 8), spray * (vehicle.width * .55 + 2));
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(lane.angle + collisionJolt);
      ctx.scale(vehicle.length / 21, Math.max(.5, vehicle.width / 11));
      ctx.drawImage(sprite, -25, -20, 80, 40);

      if (vehicle.emergency) {
        const flash = reducedMotion ? .7 : (Math.floor(state.time * 6) % 2 === 0 ? 1 : .38);
        glow(ctx, 0, -3, 11, `rgba(73,143,255,${.24 * flash})`);
        glow(ctx, 0, 3, 11, `rgba(255,91,76,${.22 * (1.2 - flash * .55)})`);
        rect(ctx, -1.6, -4.5, 1.5, 2, "#5ea0ff", .4);
        rect(ctx, .2, -4.5, 1.5, 2, "#f36d62", .4);
      }

      if (incident) {
        const hazardsOn = reducedMotion || Math.floor(state.time * 2.7) % 2 === 0;
        if (hazardsOn) {
          glow(ctx, -8, -5, 9, "#f2b24a45");
          glow(ctx, -8, 5, 9, "#f2b24a45");
          rect(ctx, -9, -5, 1.5, 1.8, "#f4c369", .4);
          rect(ctx, -9, 3.2, 1.5, 1.8, "#f4c369", .4);
        }
      }

      ctx.restore();
    }

    for (let side = 0; side < 4; side++) {
      const axis = side % 2 === 0 ? "ns" : "ew";
      const active = signalFor(state, axis);
      ctx.save();
      ctx.rotate(side * Math.PI / 2);
      line(ctx, 76, 119, 50, 119, "#0e1718", 3);
      rect(ctx, 63, 111, 10, 26, "#080e10", 3);
      const colors = { red: "#ff6553", amber: "#ffc568", green: "#a6e6b4" };
      for (const [i, color] of (["red", "amber", "green"] as const).entries()) {
        const y = 116 + i * 8;
        if (active === color) glow(ctx, 68, y, 22, colors[color] + "48");
        ctx.beginPath();
        ctx.arc(68, y, 2.6, 0, TAU);
        ctx.fillStyle = active === color ? colors[color] : "#24302b";
        ctx.fill();
      }
      if (state.lights.priorityAxis === axis) {
        glow(ctx, 47, 113, 58, "#c9eda825");
      } else {
        glow(ctx, 47, 113, 46, colors[active] + "0e");
      }
      ctx.restore();
    }

    if (!reducedMotion && state.environment.visuals.rain < .15 && state.environment.visuals.snow < .15) {
      for (let i = 0; i < 28; i++) {
        const x = ((i * 137 + state.time * (1 + i % 3)) % 1200) - 600;
        const y = ((i * 233 + state.time * .8) % 1000) - 500;
        ctx.fillStyle = `rgba(215,226,206,${.08 + Math.sin(state.time * .2 + i) * .035})`;
        ctx.beginPath();
        ctx.arc(x, y, .65 + (i % 3) * .2, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();

    drawScreenWeather(ctx, state, this.width, this.height, this.dpr, reducedMotion);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const vignette = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      this.height * .15,
      this.centerX,
      this.centerY,
      Math.max(this.width, this.height) * .75,
    );
    vignette.addColorStop(0, "#070e1000");
    vignette.addColorStop(1, "#070e10bc");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }

}
