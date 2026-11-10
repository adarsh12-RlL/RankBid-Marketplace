"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw } from "lucide-react";

const COLS = 20, ROWS = 16;
type Dir = { x: number; y: number };
type Point = { x: number; y: number };
const START_DIR: Dir = { x: 1, y: 0 };
function randomFood(snake: Point[]): Point | null {
  const empty: Point[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!snake.some(segment => segment.x === x && segment.y === y)) empty.push({ x,y });
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}
const cellStyle = (point: Point) => ({ left: `${point.x / COLS * 100}%`, top: `${point.y / ROWS * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` });

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 8 }]);
  const [food, setFood] = useState<Point | null>({ x: 15, y: 8 });
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [dead, setDead] = useState(false);
  const dirRef = useRef<Dir>(START_DIR);

  const changeDirection = useCallback((next: Dir) => {
    if (next.x === -dirRef.current.x && next.y === -dirRef.current.y) return;
    dirRef.current = next;
  }, []);
  const step = useCallback(() => {
    const head = { x: snake[0].x + dirRef.current.x, y: snake[0].y + dirRef.current.y };
    const eating = food !== null && head.x === food.x && head.y === food.y;
    const bodyToCheck = eating ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y)) {
      setRunning(false); setDead(true); return;
    }
    const nextSnake = [head, ...snake];
    if (eating) {
      setScore(value => value + 10);
      const nextFood = randomFood(nextSnake);
      setFood(nextFood);
      if (!nextFood) { setRunning(false); setDead(true); }
    } else nextSnake.pop();
    setSnake(nextSnake);
  }, [food, snake]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(step, 145);
    return () => window.clearInterval(timer);
  }, [running, step]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      if (map[event.key]) { event.preventDefault(); changeDirection(map[event.key]); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [changeDirection]);

  const reset = () => { const start = [{ x: 10, y: 8 }]; setSnake(start); setFood(randomFood(start)); dirRef.current = START_DIR; setScore(0); setDead(false); setRunning(true); };
  const buttonDirection = (next: Dir) => () => changeDirection(next);

  return <div className="mini-game snake-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Score</span><b>{score}</b></div><button type="button" className="mini-game-secondary" onClick={() => { if (dead) reset(); else setRunning(value => !value); }}>{dead ? <RotateCcw size={15}/> : null}{running ? "Pause" : dead ? "Play again" : score ? "Resume" : "Start game"}</button></div>
    <div className="snake-board" role="img" aria-label={`Snake game board. Score ${score}.`}>
      {dead && <div className="snake-overlay"><strong>{snake.length >= COLS * ROWS ? "Board cleared!" : "Round over"}</strong><span>Score: {score}</span><button type="button" className="mini-game-primary" onClick={reset}>Play again</button></div>}
      {!running && !dead && <button type="button" className="snake-overlay snake-start-overlay" onClick={reset}><strong>{score ? "Paused" : "Ready?"}</strong><span>{score ? "Tap to continue" : "Tap to start"}</span></button>}
      {food && <span className="snake-food" style={cellStyle(food)}/>}
      {snake.map((segment,index) => <span key={`${segment.x}-${segment.y}-${index}`} className={`snake-segment ${index === 0 ? "head" : ""}`} style={cellStyle(segment)}/>)}
    </div>
    <div className="snake-dpad" aria-label="Snake movement controls"><span/><button type="button" aria-label="Move up" onClick={buttonDirection({x:0,y:-1})}>↑</button><span/><button type="button" aria-label="Move left" onClick={buttonDirection({x:-1,y:0})}>←</button><button type="button" aria-label="Move down" onClick={buttonDirection({x:0,y:1})}>↓</button><button type="button" aria-label="Move right" onClick={buttonDirection({x:1,y:0})}>→</button></div>
    <p className="mini-game-caption">Collect the orange targets and avoid the walls and your own tail. Use arrow keys or the touch controls.</p>
  </div>;
}
