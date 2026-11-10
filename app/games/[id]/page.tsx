"use client";

import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, Gamepad2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WordleGame from "@/components/games/WordleGame";
import SnakeGame from "@/components/games/SnakeGame";
import MemoryGame from "@/components/games/MemoryGame";
import TriviaGame from "@/components/games/TriviaGame";
import Game2048 from "@/components/games/Game2048";
import TypingGame from "@/components/games/TypingGame";
import RPSGame from "@/components/games/RPSGame";
import ColorGame from "@/components/games/ColorGame";
import SudokuGame from "@/components/games/SudokuGame";
import MinesweeperGame from "@/components/games/MinesweeperGame";
import SimonGame from "@/components/games/SimonGame";
import TicTacToeGame from "@/components/games/TicTacToeGame";
import HangmanGame from "@/components/games/HangmanGame";
import QuickMathGame from "@/components/games/QuickMathGame";
import ReflexGame from "@/components/games/ReflexGame";
import { GAME_BY_ID } from "@/lib/game-catalog";

const GAME_COMPONENTS: Record<string, ComponentType> = {
  wordle: WordleGame,
  snake: SnakeGame,
  memory: MemoryGame,
  trivia: TriviaGame,
  "2048": Game2048,
  typing: TypingGame,
  rps: RPSGame,
  color: ColorGame,
  sudoku: SudokuGame,
  minesweeper: MinesweeperGame,
  simon: SimonGame,
  tictactoe: TicTacToeGame,
  hangman: HangmanGame,
  quickmath: QuickMathGame,
  reflex: ReflexGame,
};

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = Array.isArray(params.id) ? params.id[0] : params.id;
  const game = GAME_BY_ID[gameId];
  const Game = GAME_COMPONENTS[gameId];

  return <div className="rankbid-page games-page">
    <Header />
    <main className="rankbid-page-main game-play-main">
      <Link href="/games" className="game-back-link"><ArrowLeft size={16}/> All games</Link>
      {game && Game ? <>
        <section className={`game-play-hero art-${game.id}`}>
          <span className="game-play-eyebrow"><Gamepad2 size={14}/> RANKBID ARCADE</span>
          <h1>{game.name}</h1>
          <p>{game.description}</p>
          <div className="game-play-meta"><span>{game.challenge}</span><span><Clock3 size={13}/>{game.minutes} min</span><span>{game.group}</span></div>
        </section>
        <section className="game-play-shell" aria-label={`${game.name} game`}>
          <Game />
        </section>
        <div className="game-next-link"><span>Want another round?</span><Link href="/games">Browse all 15 games <ArrowLeft size={15}/></Link></div>
      </> : <section className="game-not-found"><h1>Game not found</h1><p>That game is not in the arcade. Choose one from the game library.</p><Link href="/games">Browse all games <ArrowLeft size={15}/></Link></section>}
    </main>
    <Footer />
  </div>;
}
