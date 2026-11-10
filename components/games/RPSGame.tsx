'use client';

import { useState } from 'react';

type Choice = 'rock' | 'paper' | 'scissors';
const CHOICES: Choice[] = ['rock', 'paper', 'scissors'];
const EMOJIS: Record<Choice, string> = { rock: '✊', paper: '✋', scissors: '✌️' };

function getWinner(player: Choice, ai: Choice): 'win' | 'lose' | 'draw' {
  if (player === ai) return 'draw';
  if ((player === 'rock' && ai === 'scissors') || (player === 'paper' && ai === 'rock') || (player === 'scissors' && ai === 'paper')) return 'win';
  return 'lose';
}

export default function RPSGame() {
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [animating, setAnimating] = useState(false);

  const play = (choice: Choice) => {
    if (animating) return;
    setAnimating(true);
    setPlayerChoice(choice);
    setAiChoice(null);
    setResult(null);

    setTimeout(() => {
      const ai = CHOICES[Math.floor(Math.random() * 3)];
      const res = getWinner(choice, ai);
      setAiChoice(ai);
      setResult(res);
      setScore(s => ({
        wins: s.wins + (res === 'win' ? 1 : 0),
        losses: s.losses + (res === 'lose' ? 1 : 0),
        draws: s.draws + (res === 'draw' ? 1 : 0),
      }));
      setAnimating(false);
    }, 800);
  };

  const resultText = result === 'win' ? '🎉 You Win!' : result === 'lose' ? '😔 You Lose' : result === 'draw' ? '🤝 Draw!' : '';
  const resultColor = result === 'win' ? 'text-blue-600 dark:text-blue-400' : result === 'lose' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400';

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6">
        {(['wins', 'losses', 'draws'] as const).map(k => (
          <div key={k} className="text-center">
            <div className="text-xs text-gray-500 capitalize">{k}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{score[k]}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">You</div>
          <div className={`text-7xl transition-all ${animating ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}`}>
            {playerChoice ? EMOJIS[playerChoice] : '❓'}
          </div>
        </div>
        <div className="text-xl font-bold text-gray-400">VS</div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">AI</div>
          <div className={`text-7xl transition-all ${animating ? 'animate-spin opacity-50' : 'opacity-100'}`}>
            {animating ? '🎲' : aiChoice ? EMOJIS[aiChoice] : '❓'}
          </div>
        </div>
      </div>

      {result && (
        <div className={`text-2xl font-bold ${resultColor}`}>{resultText}</div>
      )}

      <div className="flex gap-4">
        {CHOICES.map(choice => (
          <button
            key={choice}
            onClick={() => play(choice)}
            disabled={animating}
            className="flex flex-col items-center gap-2 px-6 py-4 border-2 border-gray-200 dark:border-gray-700 hover:border-[#FF6B4A] hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <span className="text-4xl group-hover:scale-110 transition-transform">{EMOJIS[choice]}</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
