"use client";

import { useEffect, useState } from "react";
import { Bomb, Flag, RotateCcw } from "lucide-react";

const SIDE = 10;
const MINE_COUNT = 12;
type Cell = { mine: boolean; open: boolean; flag: boolean; around: number };
type Board = Cell[][];
const emptyBoard = (): Board => Array.from({ length: SIDE }, () => Array.from({ length: SIDE }, () => ({ mine: false, open: false, flag: false, around: 0 })));
const around = (row: number, col: number) => Array.from({ length: 8 }, (_, i) => [row + [-1,-1,-1,0,0,1,1,1][i], col + [-1,0,1,-1,1,-1,0,1][i]] as [number, number]).filter(([r,c]) => r >= 0 && r < SIDE && c >= 0 && c < SIDE);

function plantMines(firstRow: number, firstCol: number): Board {
  const board = emptyBoard();
  const safe = new Set([`${firstRow},${firstCol}`, ...around(firstRow, firstCol).map(([r,c]) => `${r},${c}`)]);
  const spots = Array.from({ length: SIDE * SIDE }, (_, i) => [Math.floor(i / SIDE), i % SIDE] as [number, number]).filter(([r,c]) => !safe.has(`${r},${c}`));
  for (let i = 0; i < MINE_COUNT; i++) {
    const pick = Math.floor(Math.random() * spots.length);
    const [row, col] = spots.splice(pick, 1)[0];
    board[row][col].mine = true;
  }
  for (let row = 0; row < SIDE; row++) for (let col = 0; col < SIDE; col++) {
    board[row][col].around = around(row,col).filter(([r,c]) => board[r][c].mine).length;
  }
  return board;
}

function reveal(board: Board, row: number, col: number): Board {
  const next = board.map(line => line.map(cell => ({ ...cell })));
  const pending: [number,number][] = [[row,col]];
  while (pending.length) {
    const [r,c] = pending.pop()!;
    const cell = next[r][c];
    if (cell.open || cell.flag || cell.mine) continue;
    cell.open = true;
    if (cell.around === 0) pending.push(...around(r,c));
  }
  return next;
}

export default function MinesweeperGame() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState<"won" | "lost" | "" >("");
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const flags = board.flat().filter(cell => cell.flag).length;

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  function choose(row: number, col: number, forceFlag = false) {
    if (finished) return;
    if (flagMode || forceFlag) {
      setBoard(current => current.map((line,r) => line.map((cell,c) => r === row && c === col && !cell.open ? { ...cell, flag: !cell.flag } : cell)));
      return;
    }
    const current = started ? board : plantMines(row,col).map((line,r) => line.map((cell,c) => ({ ...cell, flag: board[r][c].flag })));
    const selected = current[row][col];
    if (selected.open || selected.flag) return;
    setStarted(true);
    if (selected.mine) {
      const lost = current.map(line => line.map(cell => ({ ...cell, open: cell.open || cell.mine })));
      setBoard(lost);
      setFinished("lost");
      return;
    }
    const next = reveal(current,row,col);
    setBoard(next);
    if (next.flat().filter(cell => cell.open).length === SIDE * SIDE - MINE_COUNT) setFinished("won");
  }

  function reset() { setBoard(emptyBoard()); setStarted(false); setFinished(""); setFlagMode(false); setSeconds(0); }

  return <div className="mini-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Mines</span><b>{MINE_COUNT - flags}<small> left</small></b></div><div className="mini-game-stat"><span>Time</span><b>{seconds}<small>s</small></b></div><button type="button" className={"mini-game-secondary " + (flagMode ? "active" : "")} onClick={() => setFlagMode(value => !value)}><Flag size={15}/>Flag mode</button><button type="button" className="mini-game-icon-button" onClick={reset} aria-label="New game"><RotateCcw size={15}/></button></div>
    {finished && <div className={"mini-game-message " + (finished === "won" ? "success" : "danger")} role="status">{finished === "won" ? `Board cleared in ${seconds} seconds. Nice work!` : "Boom! Try a new board and watch the number clues."}</div>}
    <div className="minesweeper-board" role="grid" aria-label="Minesweeper board">
      {board.map((line,row) => line.map((cell,col) => <button key={`${row}-${col}`} type="button" role="gridcell" aria-label={`Row ${row + 1}, column ${col + 1}${cell.flag ? ", flagged" : cell.open ? cell.mine ? ", mine" : `, ${cell.around || "empty"}` : ", hidden"}`} disabled={Boolean(finished)} onClick={() => choose(row,col)} onContextMenu={event => { event.preventDefault(); choose(row,col,true); }} className={`minesweeper-cell ${cell.open ? "open" : ""} ${cell.mine && cell.open ? "mine" : ""}`}>
        {cell.flag ? <Flag size={13} fill="currentColor"/> : cell.open ? cell.mine ? <Bomb size={14}/> : cell.around || "" : ""}
      </button>))}
    </div>
    <p className="mini-game-caption">First tap is always safe. Use right-click or Flag mode to mark a mine. Clear every safe square to win.</p>
  </div>;
}
