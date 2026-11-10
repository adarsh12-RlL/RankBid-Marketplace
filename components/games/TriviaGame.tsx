'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const QUESTIONS = [
  { q: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Computer Style Sheets', 'Creative Style Syntax', 'Colorful Style Sheets'], answer: 0 },
  { q: 'Which language runs in a web browser?', options: ['Java', 'C++', 'JavaScript', 'Python'], answer: 2 },
  { q: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Text Protocol', 'Home Transfer Protocol'], answer: 0 },
  { q: 'What is the latest major HTML version?', options: ['HTML4', 'HTML5', 'HTML6', 'XHTML'], answer: 1 },
  { q: 'Which company created React?', options: ['Google', 'Microsoft', 'Meta (Facebook)', 'Twitter'], answer: 2 },
  { q: 'What is the command to install Node packages?', options: ['node install', 'npm install', 'pkg add', 'node add'], answer: 1 },
  { q: 'What does API stand for?', options: ['Application Programming Interface', 'App Process Integration', 'Automated Program Interface', 'Application Protocol Interface'], answer: 0 },
  { q: 'What does SQL stand for?', options: ['Simple Query Language', 'Structured Query Language', 'Sequential Query Language', 'Standard Query Logic'], answer: 1 },
  { q: 'Which framework uses components with .vue extension?', options: ['React', 'Angular', 'Vue.js', 'Svelte'], answer: 2 },
  { q: 'What does GPU stand for?', options: ['General Processing Unit', 'Graphics Processing Unit', 'Grid Processing Unit', 'Global Processing Unit'], answer: 1 },
  { q: 'Who invented the World Wide Web?', options: ['Bill Gates', 'Steve Jobs', 'Tim Berners-Lee', 'Linus Torvalds'], answer: 2 },
  { q: 'What is the default port for HTTPS?', options: ['80', '443', '8080', '3000'], answer: 1 },
  { q: 'Which of these is a NoSQL database?', options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite'], answer: 2 },
  { q: 'What does DOM stand for?', options: ['Document Object Model', 'Data Object Management', 'Digital Object Model', 'Document Oriented Model'], answer: 0 },
  { q: 'What is Git?', options: ['A database', 'A version control system', 'A programming language', 'An operating system'], answer: 1 },
];

export default function TriviaGame() {
  const [questions] = useState(() => [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 >= questions.length) { setFinished(true); }
      else { setCurrent(c => c + 1); setSelected(null); }
    }, 1200);
  };

  const reset = () => { setCurrent(0); setSelected(null); setScore(0); setFinished(false); };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '😅'}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{score}/{questions.length}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{pct >= 80 ? 'Excellent! You\'re a tech wizard!' : pct >= 60 ? 'Good job! Keep learning!' : 'Keep practicing!'}</p>
        <button onClick={reset} className="px-6 py-2.5 bg-[#FF6B4A] text-white font-semibold rounded-xl hover:bg-[#e84b2a] transition-colors">Play Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Question {current + 1}/{questions.length}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score: {score}</span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className="bg-[#FF6B4A] h-1.5 rounded-full transition-all" style={{ width: `${((current) / questions.length) * 100}%` }} />
      </div>

      <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{q.q}</h2>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let cls = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:border-[#FF6B4A]';
            if (selected !== null) {
              if (idx === q.answer) cls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
              else if (idx === selected) cls = 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400';
              else cls = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 opacity-60';
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm font-medium flex items-center justify-between ${cls}`}
              >
                <span>{opt}</span>
                {selected !== null && idx === q.answer && <CheckCircle className="w-4 h-4 text-blue-500" />}
                {selected === idx && idx !== q.answer && <XCircle className="w-4 h-4 text-orange-500" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
