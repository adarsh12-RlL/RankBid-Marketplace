"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

const START = [
  "530070000", "600195000", "098000060", "800060003", "400803001",
  "700020006", "060000280", "000419005", "000080079",
];
const SOLUTION = [
  "534678912", "672195348", "198342567", "859761423", "426853791",
  "713924856", "961537284", "287419635", "345286179",
];
const freshBoard = () => START.map(row => row.split("").map(Number));

export default function SudokuGame() {
  const [board, setBoard] = useState(freshBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [won, setWon] = useState(false);
  const filled = useMemo(() => board.flat().filter(Boolean).length, [board]);

  function enter(value: number) {
    if (!selected || won) return;
    const [row, col] = selected;
    if (START[row][col] !== "0") return;
    const next = board.map(line => [...line]);
    next[row][col] = value;
    setBoard(next);
    setMessage("");
    if (value !== 0 && value !== Number(SOLUTION[row][col])) {
      setMistakes(count => count + 1);
      setMessage("That number does not fit this square.");
      return;
    }
    if (next.every((line, r) => line.every((cell, c) => cell === Number(SOLUTION[r][c])))) {
      setWon(true);
      setMessage("Puzzle solved. Great work!");
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[1-9]$/.test(event.key)) enter(Number(event.key));
      else if (event.key === "Backspace" || event.key === "Delete") enter(0);
      else if (event.key.startsWith("Arrow") && selected) {
        event.preventDefault();
        const [row, col] = selected;
        setSelected([Math.max(0, Math.min(8, row + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0))), Math.max(0, Math.min(8, col + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0)))]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function reset() { setBoard(freshBoard()); setSelected(null); setMessage(""); setMistakes(0); setWon(false); }

  return <div className="mini-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Filled</span><b>{filled}<small>/81</small></b></div><div className="mini-game-stat"><span>Mistakes</span><b>{mistakes}</b></div><button type="button" className="mini-game-secondary" onClick={reset}><RotateCcw size={15}/>New puzzle</button></div>
    {message && <p className={"mini-game-message " + (won ? "success" : "")} role="status">{message}</p>}
    <div className="sudoku-board" role="grid" aria-label="Sudoku puzzle">
      {board.map((line, row) => line.map((value, col) => {
        const selectedCell = selected?.[0] === row && selected?.[1] === col;
        const sameNumber = value !== 0 && selected && board[selected[0]][selected[1]] === value;
        return <button key={`${row}-${col}`} type="button" role="gridcell" aria-label={`Row ${row + 1}, column ${col + 1}${value ? `, ${value}` : ", empty"}`} aria-selected={selectedCell} onClick={() => setSelected([row,col])}
          className={`sudoku-cell ${START[row][col] !== "0" ? "given" : "editable"} ${selectedCell ? "selected" : ""} ${sameNumber ? "same-number" : ""} ${col % 3 === 2 && col < 8 ? "box-right" : ""} ${row % 3 === 2 && row < 8 ? "box-bottom" : ""}`}>
          {value || ""}
        </button>;
      }))}
    </div>
    <div className="mini-game-number-pad" aria-label="Choose a number">{[1,2,3,4,5,6,7,8,9].map(value => <button key={value} type="button" onClick={() => enter(value)} disabled={!selected || won}>{value}</button>)}<button type="button" onClick={() => enter(0)} disabled={!selected || won} aria-label="Erase selected square">⌫</button></div>
    <p className="mini-game-caption">Choose a square, then tap a number. Each row, column and 3 × 3 box must contain 1–9 once.</p>
  </div>;
}
