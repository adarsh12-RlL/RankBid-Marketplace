'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TEXTS = [
  'The quick brown fox jumps over the lazy dog near the riverbank.',
  'React makes it painless to create interactive UIs for web applications.',
  'TypeScript is a strongly typed programming language that builds on JavaScript.',
  'Next.js gives you the best developer experience with features your production needs.',
  'Tailwind CSS is a utility-first CSS framework for rapidly building custom designs.',
  'Artificial intelligence is transforming the way we build and deploy software today.',
];

export default function TypingGame() {
  const [text] = useState(() => TEXTS[Math.floor(Math.random() * TEXTS.length)]);
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!started) {
      setStarted(true);
      const t = Date.now();
      setStartTime(t);
      timerRef.current = setInterval(() => setElapsed(Date.now() - t), 100);
    }
    setInput(val);

    const correct = val.split('').filter((c, i) => c === text[i]).length;
    setAccuracy(val.length > 0 ? Math.round((correct / val.length) * 100) : 100);

    if (val === text) {
      clearInterval(timerRef.current);
      const minutes = (Date.now() - startTime) / 60000;
      const words = text.split(' ').length;
      setWpm(Math.round(words / minutes));
      setFinished(true);
    }
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setInput('');
    setStarted(false);
    setFinished(false);
    setElapsed(0);
    setWpm(0);
    setAccuracy(100);
    inputRef.current?.focus();
  };

  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-center"><div className="text-xs text-gray-500">TIME</div><div className="font-bold text-gray-900 dark:text-white">{seconds}s</div></div>
          <div className="text-center"><div className="text-xs text-gray-500">WPM</div><div className="font-bold text-gray-900 dark:text-white">{started && !finished ? Math.round((input.split(' ').length / Math.max(elapsed / 60000, 0.001))) : wpm}</div></div>
          <div className="text-center"><div className="text-xs text-gray-500">ACC</div><div className="font-bold text-gray-900 dark:text-white">{accuracy}%</div></div>
        </div>
        <button onClick={reset} className="text-sm text-[#FF6B4A] font-medium hover:underline">Reset</button>
      </div>

      <div className="p-5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-mono text-sm leading-relaxed select-none">
        {text.split('').map((char, i) => {
          let cls = 'text-gray-400 dark:text-gray-500';
          if (i < input.length) cls = input[i] === char ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 rounded';
          if (i === input.length) cls = 'text-gray-900 dark:text-white bg-[#FF6B4A]/20 rounded';
          return <span key={i} className={cls}>{char}</span>;
        })}
      </div>

      {finished ? (
        <div className="text-center p-6 border border-gray-100 dark:border-gray-800 rounded-2xl">
          <p className="text-3xl font-bold text-[#FF6B4A]">{wpm} WPM</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Accuracy: {accuracy}% · Time: {seconds}s</p>
          <p className="text-sm text-gray-500 mt-1">{wpm > 80 ? '🏆 Exceptional!' : wpm > 60 ? '🎯 Great speed!' : wpm > 40 ? '👍 Good job!' : '💪 Keep practicing!'}</p>
          <button onClick={reset} className="mt-4 px-6 py-2.5 bg-[#FF6B4A] text-white font-semibold rounded-xl hover:bg-[#e84b2a]">Try Again</button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 focus:border-[#FF6B4A] rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none"
          placeholder="Start typing..."
          autoFocus
        />
      )}
    </div>
  );
}
