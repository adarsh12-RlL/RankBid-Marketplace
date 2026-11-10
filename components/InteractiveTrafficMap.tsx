"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import RotatingGlobe from "./RotatingGlobe";
import styles from "./InteractiveTrafficMap.module.css";

type LocationPoint = { latitude: number; longitude: number; visitors: number; updatedAt: string };
type MapCommand = { id: number; action: "zoomIn" | "zoomOut" | "reset" | "rotate" };
type MapStatus = "loading" | "ready" | "error" | "unsupported";
type Country = { code: string; name: string; longitude: number; latitude: number };
type RawCountry = { code: string; name: string; path: string };
type Point = { x: number; y: number };
type Feature = { type: "Feature"; geometry: { type: "Point"; coordinates: [number, number] }; properties: Record<string, string | number> };
type Collection = { type: "FeatureCollection"; features: Feature[] };
const COUNTRY_SOURCE = "ranklens-countries";
const LOCATION_SOURCE = "ranklens-shared-locations";
const EMPTY: Collection = { type: "FeatureCollection", features: [] };

// The largest ring places island nations on their main landmass and keeps
// overseas territories from pulling a country's aggregate marker into the sea.
function countryCenters(raw: RawCountry[]): Country[] {
  return raw.filter(country => /^[A-Z]{2}$/.test(country.code)).map(country => {
    const tokens = country.path.match(/[MLZmlz]|-?(?:\d+\.?\d*|\.\d+)/g) || [];
    const rings: Point[][] = [];
    let command = "", ring: Point[] = [], index = 0, x = 0, y = 0;
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
      x = absolute ? Number(token) : x + Number(token); y = absolute ? next : y + next;
      if (command.toUpperCase() === "M" && ring.length > 2) { rings.push(ring); ring = []; }
      ring.push({ x, y });
      if (command.toUpperCase() === "M") command = absolute ? "L" : "l";
    }
    if (ring.length > 2) rings.push(ring);
    let largest = 0, center = { x: 450, y: 225 };
    for (const polygon of rings) {
      let twiceArea = 0, centerX = 0, centerY = 0;
      for (let point = 0; point < polygon.length; point++) {
        const one = polygon[point], two = polygon[(point + 1) % polygon.length];
        const cross = one.x * two.y - two.x * one.y;
        twiceArea += cross; centerX += (one.x + two.x) * cross; centerY += (one.y + two.y) * cross;
      }
      if (Math.abs(twiceArea) > largest) {
        largest = Math.abs(twiceArea); center = { x: centerX / (3 * twiceArea), y: centerY / (3 * twiceArea) };
      }
    }
    return { code: country.code, name: country.name, longitude: center.x / 900 * 360 - 180, latitude: Math.max(-85, Math.min(85, 90 - center.y / 450 * 180)) };
  });
}

function countryData(countries: Country[], counts: ReadonlyMap<string, number>): Collection {
  return { type: "FeatureCollection", features: countries.filter(country => (counts.get(country.code) || 0) > 0).map(country => ({
    type: "Feature", geometry: { type: "Point", coordinates: [country.longitude, country.latitude] },
    properties: { code: country.code, name: country.name, visitors: counts.get(country.code) || 0, label: country.code + " · " + (counts.get(country.code) || 0).toLocaleString("en-US") },
  })) };
}

function locationData(points: LocationPoint[]): Collection {
  return { type: "FeatureCollection", features: points.filter(point => Number.isFinite(point.longitude) && Number.isFinite(point.latitude) && point.latitude >= -90 && point.latitude <= 90 && point.longitude >= -180 && point.longitude <= 180 && point.visitors > 0).map(point => ({
    type: "Feature", geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    properties: { visitors: point.visitors, updatedAt: point.updatedAt, label: String(point.visitors) },
  })) };
}

export default function InteractiveTrafficMap({
  countryCounts, sharedLocationPoints = [], theme, command, onCountrySelect, onStatus, onRotationChange,
}: {
  countryCounts: ReadonlyMap<string, number>;
  sharedLocationPoints?: LocationPoint[];
  theme: "dark" | "light";
  command?: MapCommand;
  onCountrySelect: (code: string) => void;
  onStatus?: (status: MapStatus) => void;
  onRotationChange?: (rotating: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const countryRef = useRef<Country[]>([]);
  const props = useRef({ countryCounts, sharedLocationPoints, onCountrySelect, onStatus, onRotationChange });
  props.current = { countryCounts, sharedLocationPoints, onCountrySelect, onStatus, onRotationChange };
  const rotate = useRef(true), reducedMotion = useRef(false), styleReady = useRef(false);
  const setSources = useRef<() => void>(() => {});
  const [fallback, setFallback] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const initialTheme = useRef(theme);
  const lastCommand = useRef<number | undefined>(undefined);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false, animation = 0, timeout = 0;
    let map: MapLibreMap | null = null, popup: Popup | null = null;
    let previousFrame = 0, interacting = false, lastInteraction = 0;
    let observer: ResizeObserver | null = null;
    const controller = new AbortController();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = motionQuery.matches;
    rotate.current = !motionQuery.matches;
    props.current.onRotationChange?.(rotate.current);
    props.current.onStatus?.("loading");

    // Immediate watchdog: if 3D MapLibre tiles do not paint within 5s, activate fallback seamlessly
    timeout = window.setTimeout(() => {
      if (!styleReady.current) fail("error");
    }, 5000);

    function fail(status: "error" | "unsupported") {
      if (cancelled) return;
      styleReady.current = false; mapRef.current = null;
      window.clearTimeout(timeout); cancelAnimationFrame(animation);
      if (map) { try { map.remove(); } catch {} map = null; }
      setMapReady(false);
      setFallback(true);
      props.current.onStatus?.(status === "unsupported" ? "unsupported" : "ready");
    }
    function syncSources() {
      if (!map || !styleReady.current) return;
      const countries = map.getSource(COUNTRY_SOURCE) as GeoJSONSource | undefined;
      const locations = map.getSource(LOCATION_SOURCE) as GeoJSONSource | undefined;
      void countries?.setData(countryData(countryRef.current, props.current.countryCounts)).catch(() => {});
      void locations?.setData(locationData(props.current.sharedLocationPoints)).catch(() => {});
    }
    setSources.current = syncSources;
    function stopRotation() {
      rotate.current = false; props.current.onRotationChange?.(false); lastInteraction = performance.now();
    }
    let lastRotateTime = 0;
    function tick(time: number) {
      if (cancelled || !map) return;
      const elapsed = Math.min(100, time - (previousFrame || time)); previousFrame = time;
      if (rotate.current && !reducedMotion.current && !interacting && !document.hidden && styleReady.current && !map.isMoving() && map.getZoom() < 3 && time - lastInteraction > 800) {
        if (time - lastRotateTime > 35) {
          lastRotateTime = time;
          const center = map.getCenter();
          map.jumpTo({ center: [center.lng + 0.1, center.lat] });
        }
      }
      animation = requestAnimationFrame(tick);
    }
    const preferenceChanged = () => { reducedMotion.current = motionQuery.matches; if (motionQuery.matches) stopRotation(); };
    motionQuery.addEventListener("change", preferenceChanged);

    void Promise.all([
      import("maplibre-gl"),
      fetch("/maps/world-countries.json", { cache: "force-cache", signal: controller.signal })
        .then(response => response.ok ? response.json() : { countries: [] })
        .catch(() => ({ countries: [] })),
    ]).then(([library, world]: [typeof import("maplibre-gl"), { countries?: RawCountry[] }]) => {
      if (cancelled) return;
      countryRef.current = countryCenters(world.countries || []);
      try {
        try {
          library.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
        } catch {
          try {
            library.setWorkerUrl("https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl-worker.js");
          } catch {}
        }
        map = new library.Map({
          container: element, style: initialTheme.current === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron",
          // Keep the shared, privacy-preserving map at globe/country/city scale.
          // Street-level zoom made the dark basemap look like an empty silhouette.
          center: [25, 18], zoom: -.35, minZoom: -1, maxZoom: 10,
          attributionControl: false, renderWorldCopies: false, pitchWithRotate: false,
          maxPitch: 60, canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
        });
        mapRef.current = map;
        map.addControl(new library.AttributionControl({ compact: true }), "bottom-right");
        map.addControl(new library.ScaleControl({ maxWidth: 100 }), "bottom-right");
        map.on("style.load", () => {
          if (!map || cancelled) return;
          map.setProjection({ type: "globe" });
          map.setSky({ "sky-color": "#020916", "horizon-color": "#315287", "fog-color": "#101c31", "sky-horizon-blend": .7, "horizon-fog-blend": .7, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 4, .8, 7, 0] });
          map.addSource(COUNTRY_SOURCE, { type: "geojson", data: countryData(countryRef.current, props.current.countryCounts) });
          map.addSource(LOCATION_SOURCE, { type: "geojson", data: locationData(props.current.sharedLocationPoints), cluster: true, clusterRadius: 38, clusterMaxZoom: 10, clusterProperties: { visitors: ["+", ["get", "visitors"]] } });
          map.addLayer({ id: "ranklens-country-halo", type: "circle", source: COUNTRY_SOURCE, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 17, 6, 22], "circle-color": "#7dd3fc", "circle-opacity": .13, "circle-blur": .4 } });
          map.addLayer({ id: "ranklens-country-points", type: "circle", source: COUNTRY_SOURCE, paint: { "circle-radius": 6, "circle-color": "#90d5ff", "circle-stroke-width": 2, "circle-stroke-color": "#23394a", "circle-opacity": .95 } });
          map.addLayer({ id: "ranklens-country-labels", type: "symbol", source: COUNTRY_SOURCE, layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.35], "text-anchor": "top", "text-allow-overlap": false }, paint: { "text-color": "#d9f1ff", "text-halo-color": "#122433", "text-halo-width": 1.6 } });
          map.addLayer({ id: "ranklens-location-halo", type: "circle", source: LOCATION_SOURCE, paint: { "circle-radius": 23, "circle-color": "#ff9b6b", "circle-opacity": .18, "circle-blur": .65 } });
          map.addLayer({ id: "ranklens-location-points", type: "circle", source: LOCATION_SOURCE, paint: { "circle-radius": ["case", ["has", "point_count"], 14, 11], "circle-color": "#eb8a59", "circle-stroke-color": "#ffe2c6", "circle-stroke-width": 2, "circle-opacity": .98 } });
          map.addLayer({ id: "ranklens-location-labels", type: "symbol", source: LOCATION_SOURCE, layout: { "text-field": ["to-string", ["get", "visitors"]], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": "#25190e" } });
          styleReady.current = true; window.clearTimeout(timeout); setMapReady(true); props.current.onStatus?.("ready");
        });
        map.on("styledataloading", () => { styleReady.current = false; });
        map.on("error", () => { /* Individual unavailable tiles must not discard a usable map. The load timeout handles total failure. */ });
        map.on("webglcontextlost", () => fail("unsupported"));
        map.on("dragstart", () => { interacting = true; stopRotation(); });
        map.on("dragend", () => { interacting = false; lastInteraction = performance.now(); });
        map.on("zoomstart", event => { if (event.originalEvent) stopRotation(); });
        map.on("rotatestart", event => { if (event.originalEvent) stopRotation(); });
        map.on("mouseenter", "ranklens-country-points", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "ranklens-country-points", () => { if (map) map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "ranklens-location-points", () => { if (map) map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "ranklens-location-points", () => { if (map) map.getCanvas().style.cursor = ""; });
        map.on("click", async event => {
          if (!map || !styleReady.current) return;
          const features = map.queryRenderedFeatures(event.point, { layers: ["ranklens-location-points", "ranklens-country-points"] });
          const feature = features[0]; if (!feature || feature.geometry.type !== "Point") return;
          stopRotation(); popup?.remove();
          const coordinate = feature.geometry.coordinates as [number, number];
          if (feature.layer.id === "ranklens-country-points") {
            props.current.onCountrySelect(String(feature.properties.code));
            map.flyTo({ center: coordinate, zoom: 4, duration: reducedMotion.current ? 0 : 1100 });
            return;
          }
          if (feature.properties.cluster) {
            const source = map.getSource(LOCATION_SOURCE) as GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(Number(feature.properties.cluster_id)).catch(() => 6);
            if (!map || cancelled) return;
            map.easeTo({ center: coordinate, zoom: Math.min(12, zoom + .4), duration: reducedMotion.current ? 0 : 700 });
            return;
          }
          const content = document.createElement("div"), title = document.createElement("strong"), description = document.createElement("p");
          title.textContent = Number(feature.properties.visitors).toLocaleString("en-US") + " consenting visitor" + (Number(feature.properties.visitors) === 1 ? "" : "s");
          description.textContent = "Shared approximate area · about 10 km precision. This marker does not identify an exact address.";
          content.append(title, description);
          popup = new library.Popup({ className: styles.popup, closeButton: true, maxWidth: "260px", offset: 16 }).setLngLat(coordinate).setDOMContent(content).addTo(map);
          map.flyTo({ center: coordinate, zoom: Math.max(map.getZoom(), 9), duration: reducedMotion.current ? 0 : 1100 });
        });
        observer = new ResizeObserver(() => map?.resize()); observer.observe(element);
        animation = requestAnimationFrame(tick);
      } catch { fail("unsupported"); }
    }).catch(() => { if (!cancelled) fail("error"); });
    return () => {
      cancelled = true; controller.abort(); window.clearTimeout(timeout); cancelAnimationFrame(animation);
      motionQuery.removeEventListener("change", preferenceChanged); observer?.disconnect(); popup?.remove();
      if (map) map.remove(); mapRef.current = null; styleReady.current = false; setSources.current = () => {};
    };
  }, []);

  useEffect(() => { setSources.current(); }, [countryCounts, sharedLocationPoints]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || initialTheme.current === theme) return;
    initialTheme.current = theme; styleReady.current = false; props.current.onStatus?.("loading");
    map.setStyle(theme === "dark" ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron");
  }, [theme]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !command || command.id === lastCommand.current) return;
    lastCommand.current = command.id;
    if (command.action === "rotate") {
      rotate.current = !rotate.current; props.current.onRotationChange?.(rotate.current);
      if (rotate.current && map.getZoom() >= 3) map.flyTo({ center: [map.getCenter().lng, 18], zoom: -.35, pitch: 0, bearing: 0, duration: reducedMotion.current ? 0 : 1000 });
    } else if (command.action === "reset") {
      map.flyTo({ center: [25, 18], zoom: -.35, pitch: 0, bearing: 0, duration: reducedMotion.current ? 0 : 1100 });
    } else {
      rotate.current = false; props.current.onRotationChange?.(false);
      map.easeTo({ zoom: Math.max(-1, Math.min(10, map.getZoom() + (command.action === "zoomIn" ? 1 : -1))), duration: reducedMotion.current ? 0 : 350 });
    }
  }, [command]);

  return (
    <div className={`${styles.root} ${theme === "dark" ? styles.dark : styles.light}`}>
      {(!mapReady || fallback) && (
        <RotatingGlobe
          className={styles.fallback}
          mode="live"
          countryCounts={countryCounts}
          onCountrySelect={onCountrySelect}
        />
      )}
      <div
        ref={container}
        className={styles.map}
        style={{ opacity: mapReady ? 1 : 0, transition: "opacity 0.5s ease-in-out", pointerEvents: mapReady ? "auto" : "none" }}
        role="region"
        aria-label="Interactive world globe. Drag to rotate, scroll or pinch to zoom into countries, cities and streets."
      />
    </div>
  );
}
