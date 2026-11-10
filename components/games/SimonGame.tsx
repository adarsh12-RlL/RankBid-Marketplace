"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

const COLORS = ["blue", "orange", "white", "dark"] as const;
type Phase = "ready" | "watch" | "input" | "over";

export default function SimonGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [watchIndex, setWatchIndex] = useState(0);
  const [inputIndex, setInputIndex] = useState(0);
  const [lit, setLit] = useState(-1);
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (phase !== "watch") return;
    if (watchIndex >= sequence.length) {
      const timer = window.setTimeout(() => { setLit(-1); setPhase("input"); }, 350);
      return () => window.clearTimeout(timer);
    }
    setLit(sequence[watchIndex]);
    const timer = window.setTimeout(() => { setLit(-1); setWatchIndex(index => index + 1); }, 550);
    return () => window.clearTimeout(timer);
  }, [phase, sequence, watchIndex]);

  function start() { setSequence([Math.floor(Math.random() * 4)]); setWatchIndex(0); setInputIndex(0); setPhase("watch"); }

  function tap(index: number) {
    if (phase !== "input") return;
    setLit(index);
    window.setTimeout(() => setLit(-1), 180);
    if (sequence[inputIndex] !== index) {
      setBest(value => Math.max(value, sequence.length - 1));
      setPhase("over");
      return;
    }
    if (inputIndex + 1 === sequence.length) {
      setSequence(current => [...current, Math.floor(Math.random() * 4)]);
      setWatchIndex(0);
      setInputIndex(0);
      setPhase("watch");
    }
    else setInputIndex(value => value + 1);
  }

  return <div className="mini-game simon-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Sequence</span><b>{Math.max(0, sequence.length - (phase === "over" ? 1 : 0))}</b></div><div className="mini-game-stat"><span>Best</span><b>{best}</b></div><span className="mini-game-status">{phase === "watch" ? "Watch the pattern" : phase === "input" ? "Your turn" : phase === "over" ? "Round over" : "Ready when you are"}</span></div>
    <div className="simon-board" aria-label="Simon sequence pads">{COLORS.map((color,index) => <button key={color} type="button" aria-label={`Pad ${index + 1}`} disabled={phase === "ready" || phase === "watch" || phase === "over"} onClick={() => tap(index)} className={`simon-pad ${color} ${lit === index ? "lit" : ""}`}/>)}</div>
    {phase === "ready" && <p className="mini-game-caption">Memorize the flashes and repeat them in order. Each round adds one more.</p>}
    {phase === "over" && <div className="mini-game-message">You reached {Math.max(0,sequence.length - 1)} steps. Ready for another round?</div>}
    <button type="button" className="mini-game-primary" onClick={start}><Play size={15}/>{phase === "ready" ? "Start sequence" : "Play again"}<RotateCcw size={14}/></button>
  </div>;
}
