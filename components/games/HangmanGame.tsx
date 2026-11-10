"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const WORDS = [
  { word: "ORBIT", hint: "A path around a planet or star" },
  { word: "PUZZLE", hint: "A game that makes you think" },
  { word: "GARDEN", hint: "A place where plants grow" },
  { word: "PLANET", hint: "A large world moving around a star" },
  { word: "BRIDGE", hint: "A structure built to cross a gap" },
  { word: "POCKET", hint: "A small fabric space in clothing" },
  { word: "CANDLE", hint: "A wax light with a wick" },
  { word: "MOSAIC", hint: "A picture made from small pieces" },
];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_MISSES = 6;

export default function HangmanGame() {
  const [round, setRound] = useState(() => Math.floor(Math.random() * WORDS.length));
  const [guessed, setGuessed] = useState<string[]>([]);
  const word = WORDS[round];
  const misses = guessed.filter(letter => !word.word.includes(letter)).length;
  const won = word.word.split("").every(letter => guessed.includes(letter));
  const lost = misses >= MAX_MISSES && !won;
  const finished = won || lost;

  function guess(letter: string) {
    if (!finished && !guessed.includes(letter)) setGuessed(value => [...value, letter]);
  }
  function reset() {
    setRound(value => (value + 1 + Math.floor(Math.random() * (WORDS.length - 1))) % WORDS.length);
    setGuessed([]);
  }

  return <div className="mini-game hangman-game">
    <div className="mini-game-toolbar">
      <div className="mini-game-stat"><span>Misses</span><b>{misses}<small>/{MAX_MISSES}</small></b></div>
      <div className="mini-game-stat"><span>Letters found</span><b>{word.word.split("").filter(letter => guessed.includes(letter)).length}<small>/{word.word.length}</small></b></div>
      <button type="button" className="mini-game-secondary" onClick={reset}><RotateCcw size={15}/>New word</button>
    </div>
    <div className="hangman-stage" aria-label={`${misses} incorrect guesses`}>
      <svg className="hangman-art" viewBox="0 0 220 180" role="img" aria-label="Word rescue drawing">
        <path className="hangman-frame" d="M32 158h146M59 158V25h90v18M59 56h36" />
        {misses > 0 && <circle className="hangman-part" cx="149" cy="57" r="15" />}
        {misses > 1 && <path className="hangman-part" d="M149 72v42" />}
        {misses > 2 && <path className="hangman-part" d="m149 82-24 20" />}
        {misses > 3 && <path className="hangman-part" d="m149 82 24 20" />}
        {misses > 4 && <path className="hangman-part" d="m149 114-20 27" />}
        {misses > 5 && <path className="hangman-part" d="m149 114 20 27" />}
      </svg>
      <div className="hangman-hint"><span>Hint</span><strong>{word.hint}</strong></div>
    </div>
    <div className="hangman-word" aria-label="Hidden word">{word.word.split("").map((letter, index) => <span key={index}>{guessed.includes(letter) || lost ? letter : ""}</span>)}</div>
    {finished && <div className={`mini-game-message ${won ? "success" : "danger"}`} role="status">{won ? "You saved the word. Nicely done!" : `The word was ${word.word}. Try another one!`}</div>}
    <div className="hangman-keyboard" aria-label="Choose a letter">{LETTERS.map(letter => {
      const used = guessed.includes(letter);
      const correct = used && word.word.includes(letter);
      return <button key={letter} type="button" className={`hangman-key ${used ? "used" : ""} ${correct ? "correct" : ""}`} disabled={used || finished} onClick={() => guess(letter)}>{letter}</button>;
    })}</div>
    {finished && <button type="button" className="mini-game-primary" onClick={reset}><RotateCcw size={15}/>Play another word</button>}
    <p className="mini-game-caption">Choose letters to uncover the word. You have six misses.</p>
  </div>;
}
