"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };
type Country = { code: string; name: string; rings: Point[][]; center: Point };
type RawCountry = { code: string; name: string; path: string };
type ProjectedPoint = { x: number; y: number; z: number };

const MAP_WIDTH = 900;
const MAP_HEIGHT = 450;
const TAU = Math.PI * 2;

function parsePath(path: string) {
  const tokens = path.match(/[MLZmlz]|-?(?:\d+\.?\d*|\.\d+)/g) || [];
  const rings: Point[][] = [];
  let ring: Point[] = [], command = "", index = 0, x = 0, y = 0;
  while (index < tokens.length) {
    const token = tokens[index++];
    if (/^[MLZmlz]$/.test(token)) {
      command = token;
      if (token.toUpperCase() === "Z") { if (ring.length > 2) rings.push(ring); ring = []; }
      continue;
    }
    if (!command || command.toUpperCase() === "Z") continue;
    const next = Number(tokens[index++]);
    if (!Number.isFinite(next)) break;
    const absolute = command === command.toUpperCase();
    x = absolute ? Number(token) : x + Number(token);
    y = absolute ? next : y + next;
    if (command.toUpperCase() === "M" && ring.length > 2) { rings.push(ring); ring = []; }
    ring.push({ x, y });
    if (command.toUpperCase() === "M") command = absolute ? "L" : "l";
  }
  if (ring.length > 2) rings.push(ring);
  return rings;
}

function makeCountries(raw: RawCountry[]) {
  return raw.map(country => {
    const rings = parsePath(country.path);
    let areaWeight = 0, weightedX = 0, weightedY = 0, fallback = { x: 450, y: 225 }, largest = 0;
    for (const ring of rings) {
      let twiceArea = 0, centerX = 0, centerY = 0;
      for (let index = 0; index < ring.length; index++) {
        const one = ring[index], two = ring[(index + 1) % ring.length];
        const cross = one.x * two.y - two.x * one.y;
        twiceArea += cross; centerX += (one.x + two.x) * cross; centerY += (one.y + two.y) * cross;
      }
      const magnitude = Math.abs(twiceArea / 2);
      if (magnitude < 1e-5) continue;
      const center = { x: centerX / (3 * twiceArea), y: centerY / (3 * twiceArea) };
      weightedX += center.x * magnitude; weightedY += center.y * magnitude; areaWeight += magnitude;
      if (magnitude > largest) { largest = magnitude; fallback = center; }
    }
    const center = areaWeight > 0 ? { x: weightedX / areaWeight, y: weightedY / areaWeight } : fallback;
    return { code: country.code, name: country.name, rings, center };
  });
}

function compactCount(value: number) {
  return value >= 10000 ? Math.round(value / 1000) + "k" : value >= 1000 ? (value / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(value);
}

function project(point: Point, angle: number, cx: number, cy: number, radius: number): ProjectedPoint {
  const latitude = Math.PI / 2 - point.y / MAP_HEIGHT * Math.PI;
  const longitude = point.x / MAP_WIDTH * TAU - Math.PI + angle;
  const cosine = Math.cos(latitude);
  return { x: cx + radius * cosine * Math.sin(longitude), y: cy - radius * Math.sin(latitude), z: cosine * Math.cos(longitude) };
}

function pointInRing(point: Point, ring: Point[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const one = ring[index], two = ring[previous];
    if ((one.y > point.y) !== (two.y > point.y) && point.x < (two.x - one.x) * (point.y - one.y) / (two.y - one.y) + one.x)
      inside = !inside;
  }
  return inside;
}

function unproject(x: number, y: number, cx: number, cy: number, radius: number, angle: number): Point | null {
  const globeX = (x - cx) / radius, globeY = (cy - y) / radius;
  const distance = globeX * globeX + globeY * globeY;
  if (distance > 1) return null;
  const depth = Math.sqrt(1 - distance);
  const longitude = Math.atan2(globeX, depth) - angle;
  const latitude = Math.asin(globeY);
  const mapX = ((longitude + Math.PI) % TAU + TAU) % TAU / TAU * MAP_WIDTH;
  const mapY = (Math.PI / 2 - latitude) / Math.PI * MAP_HEIGHT;
  return { x: mapX, y: mapY };
}

function drawSegment(ctx: CanvasRenderingContext2D, one: ProjectedPoint, two: ProjectedPoint, open: boolean) {
  if (one.z <= 0 && two.z <= 0) return false;
  if (one.z > 0 && two.z > 0) {
    if (!open) ctx.moveTo(one.x, one.y); else ctx.lineTo(one.x, one.y);
    ctx.lineTo(two.x, two.y);
    return true;
  }
  const ratio = one.z / (one.z - two.z);
  const x = one.x + (two.x - one.x) * ratio, y = one.y + (two.y - one.y) * ratio;
  if (one.z > 0) { if (!open) ctx.moveTo(one.x, one.y); ctx.lineTo(x, y); return false; }
  ctx.moveTo(x, y);
  return true;
}

function drawGraticule(ctx: CanvasRenderingContext2D, angle: number, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(160, 191, 215, .18)";
  ctx.lineWidth = Math.max(.55, radius / 950);
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    let open = false;
    for (let longitude = -180; longitude < 180; longitude += 4) {
      const one = project({ x: (longitude + 180) / 360 * MAP_WIDTH, y: (90 - latitude) / 180 * MAP_HEIGHT }, angle, cx, cy, radius);
      const two = project({ x: (longitude + 184) / 360 * MAP_WIDTH, y: (90 - latitude) / 180 * MAP_HEIGHT }, angle, cx, cy, radius);
      open = drawSegment(ctx, one, two, open);
    }
  }
  for (let longitude = -150; longitude <= 150; longitude += 30) {
    let open = false;
    for (let latitude = -90; latitude < 90; latitude += 3) {
      const one = project({ x: (longitude + 180) / 360 * MAP_WIDTH, y: (90 - latitude) / 180 * MAP_HEIGHT }, angle, cx, cy, radius);
      const two = project({ x: (longitude + 180) / 360 * MAP_WIDTH, y: (87 - latitude) / 180 * MAP_HEIGHT }, angle, cx, cy, radius);
      open = drawSegment(ctx, one, two, open);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export default function RotatingGlobe({
  className = "", mode = "live", scale = 1, countryCounts, onCountrySelect,
}: {
  className?: string;
  mode?: "setup" | "live";
  scale?: number;
  countryCounts?: ReadonlyMap<string, number>;
  onCountrySelect?: (code: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const countries = useRef<Country[]>([]);
  const counts = useRef(countryCounts);
  const onSelect = useRef(onCountrySelect);
  const scaleRef = useRef(scale);
  const projection = useRef<{ cx: number; cy: number; radius: number; angle: number } | null>(null);
  counts.current = countryCounts;
  onSelect.current = onCountrySelect;
  scaleRef.current = scale;

  useEffect(() => {
    let cancelled = false;
    fetch("/maps/world-countries.json", { cache: "force-cache" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Map unavailable")))
      .then((map: { countries?: RawCountry[] }) => { if (!cancelled && Array.isArray(map.countries)) countries.current = makeCountries(map.countries); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;
    const surface: HTMLCanvasElement = element;
    const drawing: CanvasRenderingContext2D = context;
    let frame = 0, reducedMotionTimer = 0, width = 0, height = 0, ratio = 1;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    function resize() {
      const box = surface.getBoundingClientRect();
      ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      width = Math.max(1, Math.floor(box.width)); height = Math.max(1, Math.floor(box.height));
      surface.width = Math.floor(width * ratio); surface.height = Math.floor(height * ratio);
    }
    function draw(time: number) {
      if (document.hidden) {
        frame = requestAnimationFrame(draw);
        return;
      }
      try {
        if (!width || !height || width < 30 || height < 30) resize();
        if (width < 30 || height < 30) {
          frame = requestAnimationFrame(draw);
          return;
        }
        const live = mode === "live";
        const liveShift = live ? .12 * Math.max(0, Math.min(1, (width - 760) / 440)) : 0;
        const cx = width * (.5 + liveShift), cy = height * (live ? .5 : 1.18);
        const maxAvailableRadius = Math.max(20, Math.min(cx, width - cx) - 8);
        const radius = Math.max(25, (live
          ? Math.min(Math.min(width, height) * .48, maxAvailableRadius)
          : Math.max(width, height) * .72) * (scaleRef.current || 1));
        const angle = reduceMotion ? .42 : .42 + (time - started) * .00011;
        projection.current = { cx, cy, radius, angle };
        drawing.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawing.clearRect(0, 0, width, height);
        const aura = drawing.createRadialGradient(cx, cy, Math.max(1, radius * .16), cx, cy, Math.max(2, radius * 1.16));
        aura.addColorStop(0, live ? "rgba(72, 101, 147, .28)" : "rgba(71, 106, 137, .22)");
        aura.addColorStop(.7, "rgba(27, 43, 57, .06)"); aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        drawing.fillStyle = aura; drawing.fillRect(0, 0, width, height);
        drawing.save();
        drawing.beginPath(); drawing.arc(cx, cy, radius, 0, TAU); drawing.clip();
        const ocean = drawing.createRadialGradient(cx - radius * .34, cy - radius * .44, Math.max(1, radius * .08), cx, cy, radius);
        ocean.addColorStop(0, "#364e68"); ocean.addColorStop(.48, "#1f2b3a"); ocean.addColorStop(1, "#070d15");
        drawing.fillStyle = ocean; drawing.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        drawGraticule(drawing, angle, cx, cy, radius);
        const activeCounts = counts.current || new Map<string, number>();
        const max = Math.max(1, ...activeCounts.values());
        const topCountries = new Set([...activeCounts.entries()].filter(([, count]) => count > 0)
          .sort((one, two) => two[1] - one[1]).slice(0, 10).map(([code]) => code));
        for (const country of countries.current) {
          const count = activeCounts.get(country.code) || 0;
          const highlighted = count > 0;
          drawing.save(); drawing.beginPath();
          for (const ring of country.rings) {
            let open = false;
            for (let index = 0; index < ring.length; index++) {
              const one = project(ring[index], angle, cx, cy, radius);
              const two = project(ring[(index + 1) % ring.length], angle, cx, cy, radius);
              open = drawSegment(drawing, one, two, open);
            }
          }
          drawing.strokeStyle = highlighted ? "rgba(245, 157, 123, .98)" : "rgba(190, 207, 215, .42)";
          drawing.lineWidth = highlighted ? Math.max(1.35, radius / 540) : Math.max(.55, radius / 1100);
          drawing.stroke();
          const center = project(country.center, angle, cx, cy, radius);
          if (highlighted && center.z > 0) {
            const pulse = reduceMotion ? 1 : .84 + .16 * Math.sin(time / 390 + country.center.x * .035);
            const glow = Math.max(4, 7 + 10 * Math.sqrt(count / max));
            const dot = drawing.createRadialGradient(center.x, center.y, 0, center.x, center.y, Math.max(1, glow * 2.8 * pulse));
            dot.addColorStop(0, "rgba(255, 236, 218, 1)"); dot.addColorStop(.24, "rgba(255, 128, 83, .98)"); dot.addColorStop(1, "rgba(238, 118, 76, 0)");
            drawing.fillStyle = dot; drawing.beginPath(); drawing.arc(center.x, center.y, Math.max(1, glow * 2.8 * pulse), 0, TAU); drawing.fill();
            drawing.fillStyle = "rgba(255, 225, 205, .98)"; drawing.beginPath(); drawing.arc(center.x, center.y, Math.max(2, glow * .32), 0, TAU); drawing.fill();
            if (topCountries.has(country.code)) {
              const label = country.code + " " + compactCount(count);
              drawing.font = "600 10px Arial, sans-serif";
              const labelWidth = Math.ceil(drawing.measureText(label).width) + 12, labelHeight = 17;
              const labelX = Math.min(width - labelWidth - 3, center.x + 10), labelY = Math.max(3, center.y - 23);
              drawing.fillStyle = "rgba(12, 22, 31, .88)"; drawing.fillRect(labelX, labelY, labelWidth, labelHeight);
              drawing.strokeStyle = "rgba(255, 128, 83, .74)"; drawing.lineWidth = .7; drawing.strokeRect(labelX, labelY, labelWidth, labelHeight);
              drawing.fillStyle = "#fff0e7"; drawing.textBaseline = "middle"; drawing.fillText(label, labelX + 6, labelY + labelHeight / 2);
            }
          }
          drawing.restore();
        }
        const shade = drawing.createRadialGradient(cx - radius * .3, cy - radius * .36, Math.max(1, radius * .18), cx, cy, Math.max(2, radius * 1.04));
        shade.addColorStop(0, "rgba(255,255,255,0)"); shade.addColorStop(.64, "rgba(0, 0, 0, .06)"); shade.addColorStop(1, "rgba(0, 0, 0, .64)");
        drawing.fillStyle = shade; drawing.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        drawing.restore();
        drawing.save(); drawing.strokeStyle = "rgba(155, 191, 220, .45)"; drawing.lineWidth = Math.max(1, radius / 560); drawing.shadowColor = "rgba(100, 177, 255, .5)"; drawing.shadowBlur = Math.max(10, radius / 13); drawing.beginPath(); drawing.arc(cx, cy, radius, 0, TAU); drawing.stroke(); drawing.restore();
      } catch (err) {
        console.warn("RotatingGlobe draw notice:", err);
      }
      if (reduceMotion) reducedMotionTimer = window.setTimeout(() => draw(performance.now()), 500);
      else frame = requestAnimationFrame(draw);
    }
    resize(); frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(performance.now());
    }); observer.observe(surface);
    return () => { if (frame) cancelAnimationFrame(frame); window.clearTimeout(reducedMotionTimer); observer.disconnect(); };
  }, [mode]);

  return <canvas ref={canvas} className={className} role="img" aria-label="Rotating three-dimensional world globe with country-level aggregate traffic" onClick={event => {
    if (!onSelect.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const view = projection.current;
    if (!view) return;
    const geographic = unproject(x, y, view.cx, view.cy, view.radius, view.angle);
    if (!geographic) return;
    const activeCounts = counts.current || new Map<string, number>();
    const country = countries.current.find(shape => (activeCounts.get(shape.code) || 0) > 0 && shape.rings.some(ring => pointInRing(geographic, ring)));
    if (country) onSelect.current(country.code);
  }} />;
}
