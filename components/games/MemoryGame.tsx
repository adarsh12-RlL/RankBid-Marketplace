'use client';

import { useState, useEffect, useRef } from 'react';

const EMOJIS = ['🚀','💡','🔥','⚡','🎯','🎨','🧠','🌟','💻','🎮','🔮','📱'];

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean; }

function createCards(): Card[] {
  const pairs = [...EMOJIS.slice(0, 8), ...EMOJIS.slice(0, 8)];
  return pairs.sort(() => Math.random() - 0.5).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>(createCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (mismatchTimer.current) clearTimeout(mismatchTimer.current); }, []);

  useEffect(() => {
    if (selected.length === 2) {
      setDisabled(true);
      setMoves(m => m + 1);
      const [a, b] = selected;
      if (cards[a].emoji === cards[b].emoji) {
        setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
        setSelected([]);
        setDisabled(false);
      } else {
        mismatchTimer.current = setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
          setSelected([]);
          setDisabled(false);
          mismatchTimer.current = null;
        }, 800);
      }
    }
  }, [selected, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.matched)) setWon(true);
  }, [cards]);

  const handleClick = (idx: number) => {
    if (disabled || cards[idx].flipped || cards[idx].matched || selected.length === 2) return;
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: true } : c));
    setSelected(prev => [...prev, idx]);
  };

  const reset = () => { if (mismatchTimer.current) clearTimeout(mismatchTimer.current); mismatchTimer.current = null; setCards(createCards()); setSelected([]); setMoves(0); setWon(false); setDisabled(false); };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Moves: <strong>{moves}</strong></span>
        <button onClick={reset} className="text-sm text-[#FF6B4A] font-medium hover:underline">New Game</button>
      </div>

      {won && (
        <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
          <p className="font-bold text-blue-700 dark:text-blue-400 text-lg">🎉 You Won!</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">Completed in {moves} moves</p>
          <button onClick={reset} className="mt-3 px-5 py-2 bg-[#FF6B4A] text-white font-semibold rounded-lg text-sm">Play Again</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleClick(idx)}
            className={`w-16 h-16 rounded-xl border-2 text-2xl transition-all duration-300 ${
              card.flipped || card.matched
                ? card.matched ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 scale-95' : 'bg-white dark:bg-gray-800 border-[#FF6B4A]'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}
