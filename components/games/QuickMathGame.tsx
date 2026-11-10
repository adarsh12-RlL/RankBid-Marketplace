"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

type Question = { text: string; answer: number; options: number[] };
function makeQuestion(): Question {
  const kind = Math.floor(Math.random() * 3);
  const a = Math.floor(Math.random() * (kind === 2 ? 12 : 40)) + 2;
  const b = Math.floor(Math.random() * (kind === 2 ? 12 : 35)) + 2;
  const [text, answer] = kind === 0 ? [`${a} + ${b}`, a + b] : kind === 1 ? [`${Math.max(a,b)} − ${Math.min(a,b)}`, Math.abs(a-b)] : [`${a} × ${b}`, a*b];
  const values = new Set<number>([answer]);
  while (values.size < 4) values.add(Math.max(0, answer + Math.floor(Math.random() * 17) - 8));
  return { text, answer, options: [...values].sort(() => Math.random() - 0.5) };
}

export default function QuickMathGame() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [question, setQuestion] = useState<Question>(makeQuestion);
  const [selected, setSelected] = useState<number | null>(null);
  const advanceRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (advanceRef.current !== null) window.clearTimeout(advanceRef.current);
    setScore(0); setSeconds(30); setQuestion(makeQuestion()); setSelected(null); setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => { if (active && seconds === 0) setActive(false); }, [active, seconds]);
  useEffect(() => () => { if (advanceRef.current !== null) window.clearTimeout(advanceRef.current); }, []);

  function answer(value: number) {
    if (!active || selected !== null) return;
    setSelected(value);
    if (value === question.answer) setScore(current => { const next = current + 1; setBest(previous => Math.max(previous, next)); return next; });
    advanceRef.current = window.setTimeout(() => { setQuestion(makeQuestion()); setSelected(null); advanceRef.current = null; }, 420);
  }

  return <div className="mini-game quick-math-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Time</span><b>{seconds}<small>s</small></b></div><div className="mini-game-stat"><span>Score</span><b>{score}</b></div><div className="mini-game-stat"><span>Best</span><b>{best}</b></div></div>
    {active ? <>
      <div className="quick-math-question"><span>What is</span><strong>{question.text}<small> = ?</small></strong></div>
      <div className="quick-math-options">{question.options.map(option => <button key={option} type="button" className={selected === option ? option === question.answer ? "right" : "wrong" : ""} disabled={selected !== null} onClick={() => answer(option)}>{option}</button>)}</div>
    </> : <div className="quick-math-finish"><div className="quick-math-finish-mark">{seconds === 0 ? "30" : "+"}</div><h2>{seconds === 0 ? "Time is up" : "Ready for a quick challenge?"}</h2><p>{seconds === 0 ? `You solved ${score} questions correctly.` : "Solve as many short sums as you can in 30 seconds."}</p><button type="button" className="mini-game-primary" onClick={start}>{seconds === 0 ? <RotateCcw size={15}/> : <Play size={15}/>} {seconds === 0 ? "Play again" : "Start round"}</button></div>}
    <p className="mini-game-caption">Correct answers count toward your score. A new question appears after each choice.</p>
  </div>;
}
