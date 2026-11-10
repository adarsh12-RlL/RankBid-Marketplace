'use client';

import { useState, useCallback, useEffect } from 'react';

const WORDS = ['REACT', 'SWIFT', 'PIXEL', 'CLOUD', 'AGENT', 'AUDIO', 'BLOOM', 'BRAVE', 'BYTES', 'CACHE',
  'CHAIN', 'CHUNK', 'CLASS', 'CLICK', 'CLONE', 'CRASH', 'CRYPT', 'DEBUG', 'DELTA', 'DEPOT',
  'DRAIN', 'DRIVE', 'DRONE', 'EMAIL', 'EMBED', 'FETCH', 'FIELD', 'FLAME', 'FLASH', 'FLOAT',
  'FOCUS', 'FRAME', 'FRESH', 'FRONT', 'GIANT', 'GLIDE', 'GLOBE', 'GRAPH', 'GRIDS', 'GUIDE'];

const KEYBOARD_ROWS = [['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','⌫']];

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export default function WordleGame() {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guesses, setGuesses] = useState<string[][]>(Array(6).fill(null).map(() => []));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentInput, setCurrentInput] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [letterStatuses, setLetterStatuses] = useState<Record<string, LetterStatus>>({});
  const [message, setMessage] = useState('');
  const [shake, setShake] = useState(false);

  const getStatus = (guess: string[], word: string): LetterStatus[] => {
    const result: LetterStatus[] = Array(5).fill('absent');
    const wordArr = word.split('');
    const used: boolean[] = Array(5).fill(false);
    guess.forEach((l, i) => { if (l === wordArr[i]) { result[i] = 'correct'; used[i] = true; } });
    guess.forEach((l, i) => {
      if (result[i] !== 'correct') {
        const j = wordArr.findIndex((wl, wi) => wl === l && !used[wi]);
        if (j !== -1) { result[i] = 'present'; used[j] = true; }
      }
    });
    return result;
  };

  const submitGuess = useCallback(() => {
    if (currentInput.length !== 5) { setMessage('Word must be 5 letters'); setShake(true); setTimeout(() => setShake(false), 600); return; }
    const guess = currentInput;
    const newGuesses = [...guesses];
    newGuesses[currentRow] = guess;
    setGuesses(newGuesses);

    const statuses = getStatus(guess, word);
    const newLetterStatuses = { ...letterStatuses };
    guess.forEach((l, i) => {
      const cur = newLetterStatuses[l];
      if (cur !== 'correct') {
        if (statuses[i] === 'correct') newLetterStatuses[l] = 'correct';
        else if (statuses[i] === 'present') newLetterStatuses[l] = 'present';
        else if (!cur) newLetterStatuses[l] = 'absent';
      }
    });
    setLetterStatuses(newLetterStatuses);

    if (guess.join('') === word) { setWon(true); setGameOver(true); setMessage('Brilliant! 🎉'); return; }
    if (currentRow === 5) { setGameOver(true); setMessage(`The word was ${word}`); return; }
    setCurrentRow(prev => prev + 1);
    setCurrentInput([]);
    setMessage('');
  }, [currentInput, currentRow, guesses, word, letterStatuses]);

  const handleKey = useCallback((key: string) => {
    if (gameOver) return;
    if (key === 'ENTER') { submitGuess(); return; }
    if (key === '⌫' || key === 'Backspace') { setCurrentInput(prev => prev.slice(0, -1)); return; }
    if (/^[A-Z]$/.test(key) && currentInput.length < 5) { setCurrentInput(prev => [...prev, key]); }
  }, [gameOver, currentInput, submitGuess]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key === 'Enter' ? 'ENTER' : e.key.toUpperCase());
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  const statusColor = (status: LetterStatus) => {
    if (status === 'correct') return 'bg-blue-600 text-white border-blue-600';
    if (status === 'present') return 'bg-orange-500 text-white border-orange-500';
    if (status === 'absent') return 'bg-gray-500 text-white border-gray-500';
    return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white';
  };

  const keyColor = (key: string) => {
    const s = letterStatuses[key];
    if (s === 'correct') return 'bg-blue-600 text-white';
    if (s === 'present') return 'bg-orange-500 text-white';
    if (s === 'absent') return 'bg-gray-400 text-white dark:bg-gray-600';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white';
  };

  const reset = () => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses(Array(6).fill(null).map(() => []));
    setCurrentRow(0);
    setCurrentInput([]);
    setGameOver(false);
    setWon(false);
    setLetterStatuses({});
    setMessage('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Guess the 5-letter tech word in 6 tries</p>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${won ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
          {message}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-rows-6 gap-1.5">
        {Array(6).fill(null).map((_, rowIdx) => {
          const isCurrentRow = rowIdx === currentRow;
          const rowLetters = isCurrentRow ? currentInput : guesses[rowIdx];
          const isSubmitted = rowIdx < currentRow;
          const statuses = isSubmitted ? getStatus(guesses[rowIdx], word) : [];

          return (
            <div key={rowIdx} className={`flex gap-1.5 ${shake && isCurrentRow ? 'animate-bounce' : ''}`}>
              {Array(5).fill(null).map((_, colIdx) => {
                const letter = rowLetters?.[colIdx] || '';
                const status: LetterStatus = isSubmitted ? statuses[colIdx] : (letter ? 'tbd' : 'empty');
                return (
                  <div key={colIdx} className={`w-12 h-12 border-2 rounded flex items-center justify-center text-lg font-bold uppercase transition-all ${statusColor(status)}`}>
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col gap-1.5 mt-2">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map(key => (
              <button key={key} onClick={() => handleKey(key)}
                className={`${key.length > 1 ? 'px-3 text-xs' : 'w-9'} h-12 rounded font-semibold text-sm transition-colors ${keyColor(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {gameOver && (
        <button onClick={reset} className="mt-2 px-6 py-2.5 bg-[#FF6B4A] text-white font-semibold rounded-xl hover:bg-[#e84b2a] transition-colors">
          Play Again
        </button>
      )}
    </div>
  );
}
