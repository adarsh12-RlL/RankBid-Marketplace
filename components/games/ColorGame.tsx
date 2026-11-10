'use client';

import { useState, useEffect, useCallback } from 'react';

const COLORS = [
  { name: 'Blue', hex: '#3B82F6' }, { name: 'Orange', hex: '#F97316' },
  { name: 'Black', hex: '#111827' }, { name: 'White', hex: '#F9FAFB' },
];

function getOptions(correct: string): string[] {
  const opts = [correct];
  while (opts.length < 4) {
    const r = COLORS[Math.floor(Math.random() * COLORS.length)].name;
    if (!opts.includes(r)) opts.push(r);
  }
  return opts.sort(() => Math.random() - 0.5);
}

export default function ColorGame() {
  const [color, setColor] = useState(COLORS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);

  const nextRound = useCallback(() => {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    setColor(c);
    setOptions(getOptions(c.name));
    setSelected(null);
  }, []);

  useEffect(() => { nextRound(); }, [nextRound]);

  const handleGuess = (name: string) => {
    if (selected || over) return;
    setSelected(name);
    if (name === color.name) {
      const s = score + 10 + streak * 2;
      setScore(s);
      setBest(b => Math.max(b, s));
      setStreak(st => st + 1);
      setTimeout(nextRound, 800);
    } else {
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives === 0) setOver(true);
      else setTimeout(nextRound, 1000);
    }
  };

  const reset = () => { setScore(0); setStreak(0); setLives(3); setOver(false); nextRound(); };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <div className="text-center"><div className="text-xs text-gray-500">SCORE</div><div className="text-2xl font-bold text-gray-900 dark:text-white">{score}</div></div>
        <div className="text-center"><div className="text-xs text-gray-500">BEST</div><div className="text-2xl font-bold text-gray-900 dark:text-white">{best}</div></div>
        <div className="text-center"><div className="text-xs text-gray-500">STREAK</div><div className="text-2xl font-bold text-[#FF6B4A]">{streak}🔥</div></div>
        <div className="text-center"><div className="text-xs text-gray-500">LIVES</div><div className="text-2xl">{'🟠'.repeat(lives)}{'⚫'.repeat(3 - lives)}</div></div>
      </div>

      {over ? (
        <div className="text-center p-8 border border-gray-100 dark:border-gray-800 rounded-2xl w-full">
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Game Over!</p>
          <p className="text-gray-500">Final Score: <strong>{score}</strong></p>
          <button onClick={reset} className="mt-4 px-6 py-2.5 bg-[#FF6B4A] text-white font-semibold rounded-xl">Play Again</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">What color is this?</p>
          <div className="w-48 h-48 rounded-3xl border border-gray-300 dark:border-gray-600 shadow-lg transition-all" style={{ backgroundColor: color.hex }} />
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            {options.map(opt => {
              let cls = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:border-[#FF6B4A]';
              if (selected) {
                if (opt === color.name) cls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700';
                else if (opt === selected) cls = 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600';
                else cls = 'border-gray-200 dark:border-gray-700 text-gray-400 opacity-50';
              }
              return (
                <button key={opt} onClick={() => handleGuess(opt)}
                  className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
