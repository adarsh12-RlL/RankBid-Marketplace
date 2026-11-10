"use client";

import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

type Mark = "X" | "O" | null;
type Board = Mark[];
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function winner(board: Board): Mark { for (const [a,b,c] of LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]; return null; }
function minimax(board: Board, aiTurn: boolean, depth = 0): number {
  const result = winner(board);
  if (result === "O") return 10 - depth;
  if (result === "X") return depth - 10;
  const moves = board.map((mark,index) => mark ? -1 : index).filter(index => index >= 0);
  if (!moves.length) return 0;
  const scores = moves.map(index => { const next = [...board]; next[index] = aiTurn ? "O" : "X"; return minimax(next,!aiTurn,depth + 1); });
  return aiTurn ? Math.max(...scores) : Math.min(...scores);
}
function bestMove(board: Board) {
  const moves = board.map((mark,index) => mark ? -1 : index).filter(index => index >= 0);
  return moves.reduce((best,index) => { const next = [...board]; next[index] = "O"; const score = minimax(next,false); return score > best.score ? { index, score } : best; }, { index: moves[0], score: -Infinity }).index;
}

export default function TicTacToeGame() {
  const [board,setBoard] = useState<Board>(Array(9).fill(null));
  const [status,setStatus] = useState<"playing"|"thinking"|"win"|"lose"|"draw">("playing");
  const [score,setScore] = useState({ wins: 0, draws: 0 });
  const timer = useRef<number | null>(null);

  function play(index: number) {
    if (status !== "playing" || board[index]) return;
    const afterPlayer = [...board];
    afterPlayer[index] = "X";
    const won = winner(afterPlayer);
    if (won) { setBoard(afterPlayer); setStatus("win"); setScore(value => ({ ...value, wins: value.wins + 1 })); return; }
    if (afterPlayer.every(Boolean)) { setBoard(afterPlayer); setStatus("draw"); setScore(value => ({ ...value, draws: value.draws + 1 })); return; }
    setBoard(afterPlayer);
    setStatus("thinking");
    timer.current = window.setTimeout(() => {
      const aiMove = bestMove(afterPlayer);
      const afterAi = [...afterPlayer];
      afterAi[aiMove] = "O";
      setBoard(afterAi);
      if (winner(afterAi)) setStatus("lose");
      else if (afterAi.every(Boolean)) { setStatus("draw"); setScore(value => ({ ...value, draws: value.draws + 1 })); }
      else setStatus("playing");
    }, 280);
  }

  function reset() { if (timer.current) window.clearTimeout(timer.current); setBoard(Array(9).fill(null)); setStatus("playing"); }

  return <div className="mini-game">
    <div className="mini-game-toolbar"><div className="mini-game-stat"><span>Your wins</span><b>{score.wins}</b></div><div className="mini-game-stat"><span>Draws</span><b>{score.draws}</b></div><span className="mini-game-status">{status === "playing" ? "Your turn · X" : status === "thinking" ? "Computer is thinking…" : status === "win" ? "You won this round!" : status === "lose" ? "Computer wins this round." : "A draw!"}</span><button type="button" className="mini-game-icon-button" onClick={reset} aria-label="New round"><RotateCcw size={15}/></button></div>
    <div className="tic-board" role="grid" aria-label="Tic-Tac-Toe board">{board.map((mark,index) => <button key={index} type="button" role="gridcell" aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ", empty"}`} disabled={status !== "playing" || Boolean(mark)} onClick={() => play(index)} className={`tic-cell ${mark === "X" ? "x" : mark === "O" ? "o" : ""}`}>{mark}</button>)}</div>
    {(status === "win" || status === "lose" || status === "draw") && <button type="button" className="mini-game-primary" onClick={reset}>Play another round</button>}
    <p className="mini-game-caption">You play X. The computer looks ahead before choosing its move.</p>
  </div>;
}
