"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { RotateCcw } from "lucide-react";

type Grid = number[][];
type Direction = "left" | "right" | "up" | "down";
function createGrid(): Grid { const grid = Array.from({ length: 4 }, () => Array(4).fill(0)); addRandom(grid); addRandom(grid); return grid; }
function addRandom(grid: Grid) {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((value, c) => { if (!value) empty.push([r,c]); }));
  if (!empty.length) return;
  const [r,c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < .9 ? 2 : 4;
}
function slideLeft(source: number[]): [number[], number] {
  const values = source.filter(Boolean), result: number[] = [];
  let gained = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) { const merged = values[i] * 2; result.push(merged); gained += merged; i++; }
    else result.push(values[i]);
  }
  return [[...result, ...Array(4 - result.length).fill(0)], gained];
}
function move(grid: Grid, direction: Direction): [Grid, number] {
  const next = Array.from({ length: 4 }, () => Array(4).fill(0));
  let score = 0;
  for (let index = 0; index < 4; index++) {
    const source = direction === "left" || direction === "right"
      ? [...grid[index]]
      : grid.map(row => row[index]);
    const reverse = direction === "right" || direction === "down";
    const [line, gained] = slideLeft(reverse ? source.reverse() : source);
    const positioned = reverse ? line.reverse() : line;
    score += gained;
    for (let offset = 0; offset < 4; offset++) {
      if (direction === "left" || direction === "right") next[index][offset] = positioned[offset];
      else next[offset][index] = positioned[offset];
    }
  }
  return [next, score];
}
function hasMoves(grid: Grid) {
  return grid.some((row,r) => row.some((value,c) => !value || value === row[c + 1] || value === grid[r + 1]?.[c]));
}

const tileColors: Record<number, string> = {
  2: "tile-two", 4: "tile-four", 8: "tile-eight", 16: "tile-sixteen", 32: "tile-thirty-two",
  64: "tile-sixty-four", 128: "tile-one-twenty-eight", 256: "tile-two-fifty-six", 512: "tile-five-twelve",
  1024: "tile-one-thousand", 2048: "tile-two-thousand",
};

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(createGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const touch = useRef<[number,number] | null>(null);
  const doMove = useCallback((direction: Direction) => {
    if (over) return;
    const [next, gained] = move(grid, direction);
    const changed = next.some((row,r) => row.some((value,c) => value !== grid[r][c]));
    if (!changed) return;
    addRandom(next);
    setGrid(next);
    setScore(value => { const updated = value + gained; setBest(current => Math.max(current, updated)); return updated; });
    if (!won && next.some(row => row.includes(2048))) setWon(true);
    setOver(!hasMoves(next));
  }, [grid, over, won]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const directions: Record<string, Direction> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      const direction = directions[event.key];
      if (direction) { event.preventDefault(); doMove(direction); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove]);
  function reset() { setGrid(createGrid()); setScore(0); setWon(false); setOver(false); }
  function onTouchStart(event: TouchEvent<HTMLDivElement>) { touch.current = [event.changedTouches[0].clientX, event.changedTouches[0].clientY]; }
  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touch.current) return;
    const [startX,startY] = touch.current, dx = event.changedTouches[0].clientX - startX, dy = event.changedTouches[0].clientY - startY;
    touch.current = null;
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 18) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up");
  }

  return <div className="mini-game game-2048">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Score</span><b>{score}</b></div><div className="mini-game-stat"><span>Best</span><b>{best}</b></div><button type="button" className="mini-game-secondary" onClick={reset}><RotateCcw size={15}/>New game</button></div>
    {won && <div className="mini-game-message success" role="status">2048 reached! Keep going to build a bigger tile.</div>}
    {over && <div className="mini-game-message" role="status">No moves left. Start a new board and try again.</div>}
    <div className="board-2048" role="grid" aria-label="2048 game board" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{grid.map((row,r) => row.map((value,c) => <div key={`${r}-${c}`} role="gridcell" aria-label={`${value || "Empty"}`} className={`tile-2048 ${tileColors[value] ?? (value ? "tile-large" : "tile-empty")}`}>{value || ""}</div>))}</div>
    <div className="game-2048-controls" aria-label="Move tiles">{(["up","left","down","right"] as Direction[]).map(direction => <button key={direction} type="button" onClick={() => doMove(direction)} aria-label={`Move ${direction}`}>{direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}</button>)}</div>
    <p className="mini-game-caption">Use arrow keys, swipe or tap the controls. Matching tiles merge; the game ends when no moves remain.</p>
  </div>;
}
