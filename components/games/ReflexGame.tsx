"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

type Phase = "idle" | "waiting" | "go" | "early" | "result";
export default function ReflexGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reaction, setReaction] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);
  const signalAt = useRef(0);
  const timer = useRef<number | null>(null);
  const best = attempts.length ? Math.min(...attempts) : null;
  const average = attempts.length ? Math.round(attempts.reduce((sum, value) => sum + value, 0) / attempts.length) : null;

  const clear = useCallback(() => { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; }, []);
  useEffect(() => clear, [clear]);

  function start() {
    clear(); setReaction(null); setPhase("waiting");
    timer.current = window.setTimeout(() => { signalAt.current = performance.now(); setPhase("go"); timer.current = null; }, 1500 + Math.random() * 3000);
  }
  function tap() {
    if (phase === "waiting") { clear(); setPhase("early"); }
    else if (phase === "go") {
      const value = Math.round(performance.now() - signalAt.current);
      setReaction(value); setAttempts(current => [...current, value]); setPhase("result");
    } else if (phase === "idle" || phase === "early" || phase === "result") start();
  }
  const label = phase === "waiting" ? "Wait for the signal…" : phase === "go" ? "TAP NOW" : phase === "early" ? "Too soon — try again" : phase === "result" ? `${reaction} ms` : "Tap to begin";
  return <div className="mini-game reflex-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Best</span><b>{best === null ? "—" : <>{best}<small>ms</small></>}</b></div><div className="mini-game-stat"><span>Average</span><b>{average === null ? "—" : <>{average}<small>ms</small></>}</b></div><div className="mini-game-stat"><span>Attempts</span><b>{attempts.length}</b></div><button type="button" className="mini-game-icon-button" aria-label="Reset attempts" onClick={() => { clear(); setAttempts([]); setReaction(null); setPhase("idle"); }}><RotateCcw size={15}/></button></div>
    <button type="button" className={`reflex-signal ${phase}`} onClick={tap} aria-live="polite" aria-label={label}><span className="reflex-ring"/><strong>{label}</strong>{phase === "result" && reaction !== null && <small>{reaction < 250 ? "Lightning fast" : reaction < 350 ? "Quick reflexes" : "Try to beat your time"}</small>}</button>
    <p className="mini-game-caption">Tap when the orange signal appears. If you tap while it is blue, the round restarts.</p>
  </div>;
}
