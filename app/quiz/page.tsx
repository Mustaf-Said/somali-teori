"use client";
import { useEffect, useRef, useState } from "react";

interface Question {
  id?: string;
  category?: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface SavedState {
  started?: boolean;
  timeLeft?: number;
  current?: number;
  score?: number;
  shuffled?: Question[];
}

const STORAGE_KEY = "quiz_timer_state_v1";

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffled, setShuffled] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // MENU MODE
  const [mode, setMode] = useState<"menu" | "train" | "test">("menu");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // TIMER SETTINGS
  const defaultMinutes = 50;
  const defaultSeconds = defaultMinutes * 60;
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const intervalRef = useRef<number | null>(null);

  // -----------------------------
  // Helper Functions
  // -----------------------------
  function shuffle<T>(arr: T[]): T[] {
    const r = [...arr];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function loadSavedState(parsed: SavedState) {
    if (parsed.started) setStarted(true);
    if (typeof parsed.timeLeft === "number") setTimeLeft(parsed.timeLeft);
    if (typeof parsed.current === "number") setCurrent(parsed.current);
    if (typeof parsed.score === "number") setScore(parsed.score);
    if (Array.isArray(parsed.shuffled)) setShuffled(parsed.shuffled);
  }

  // -----------------------------
  // Load Questions
  // -----------------------------
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/questions");
      const data = await res.json();
      setQuestions(data);
      setShuffled(shuffle([...data]));
    }
    load();
  }, []);

  // Categories extracted from questions
  const categories = Array.from(new Set(questions.map(q => q.category))).filter(Boolean) as string[];

  // -----------------------------
  // Restore Timer State
  // -----------------------------
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    queueMicrotask(() => loadSavedState(parsed)); // FIX ESLINT
  }, []);

  // -----------------------------
  // Timer effect
  // -----------------------------
  useEffect(() => {
    if (!started) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setFinished(true);
          setStarted(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [started]);

  // -----------------------------
  // Save state to localStorage
  // -----------------------------
  useEffect(() => {
    const state = {
      started,
      timeLeft,
      current,
      score,
      shuffled,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [started, timeLeft, current, score, shuffled]);

  // -----------------------------
  // QUIZ CONTROLS
  // -----------------------------
  function startQuiz() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setTimeLeft(defaultSeconds);
    setStarted(true);
  }

  function handleAnswer(optionIndex: number) {
    if (selected !== null || finished) return;

    setSelected(optionIndex);

    if (optionIndex === shuffled[current].answer) {
      setScore((s) => s + 1);
    }
  }

  function nextQuestion() {
    if (current + 1 >= shuffled.length) {
      setFinished(true);
      setStarted(false);
      return;
    }

    setCurrent((c) => c + 1);
    setSelected(null);
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // -----------------------------
  // UI: MENU SCREEN
  // -----------------------------
  if (mode === "menu") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-green-50 p-6">
        <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center animate-fadeIn">

          <h1 className="text-3xl font-extrabold mb-4 text-gray-800">
            Somali Teori — Körkortsprov B
          </h1>

          <p className="text-gray-600 mb-8">
            Välj ett läge för att börja.
          </p>

          <div className="flex flex-col gap-4">

            <button
              onClick={() => setMode("train")}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg shadow-md transition-all hover:scale-[1.03]"
            >
              Träna frågor
            </button>

            <button
              onClick={() => {
                const seq = shuffle([...questions]).slice(0, 70);
                setShuffled(seq);
                setMode("test");
                startQuiz();
              }}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-lg shadow-md transition-all hover:scale-[1.03]"
            >
              Gör testprov (70 frågor)
            </button>

          </div>

        </div>
      </div>
    );
  }

  // -----------------------------
  // UI: TRAIN MODE – SELECT CATEGORY
  // -----------------------------
  if (mode === "train" && !selectedCategoryName) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-6">Välj del att träna</h1>

        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              className="w-full py-3 border rounded hover:bg-gray-100"
              onClick={() => {
                const items = questions.filter(q => q.category === cat);
                setShuffled(shuffle(items));
                setSelectedCategoryName(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMode("menu")}
          className="mt-6 text-gray-600 underline"
        >
          Tillbaka
        </button>
      </div>
    );
  }

  // -----------------------------
  // UI: START TRAINING CONFIRM
  // -----------------------------
  if (!started && mode === "train" && selectedCategoryName) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Tränar: {selectedCategoryName}</h2>

        <button
          onClick={startQuiz}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg"
        >
          Starta träning
        </button>

        <button
          onClick={() => {
            setSelectedCategoryName(null);
            setMode("menu");
          }}
          className="mt-4 block mx-auto text-gray-600 underline"
        >
          Tillbaka
        </button>
      </div>
    );
  }

  // -----------------------------
  // UI: FINISHED SCREEN
  // -----------------------------
  if (finished) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Quiz klart!</h1>
        <p className="text-lg mb-4">
          Poäng: <b>{score}</b> av {shuffled.length}
        </p>

        <p className="text-md mb-6">Tid kvar: {formatTime(timeLeft)}</p>

        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            setFinished(false);
            setStarted(false);
            setCurrent(0);
            setSelected(null);
            setScore(0);
            setShuffled([]);
            setMode("menu");
          }}
          className="px-5 py-3 border rounded"
        >
          Tillbaka till menyn
        </button>
      </div>
    );
  }

  // -----------------------------
  // UI: QUIZ SCREEN
  // -----------------------------
  const q = shuffled[current];
  const percent = Math.round((timeLeft / defaultSeconds) * 100);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>Fråga {current + 1} / {shuffled.length}</div>
        <div className="font-mono text-lg">{formatTime(timeLeft)}</div>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded mb-4">
        <div className="h-full bg-green-500" style={{ width: `${percent}%` }}></div>
      </div>

      <h2 className="text-xl font-semibold mb-4">{q.question}</h2>

      <div className="flex flex-col gap-3">
        {q.options.map((opt, idx) => {
          const correct = idx === q.answer;
          const isSelected = idx === selected;

          let base = "border p-3 rounded cursor-pointer";
          if (selected !== null) {
            if (correct) base += " bg-green-300";
            else if (isSelected) base += " bg-red-300";
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={selected !== null}
              className={base}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        {selected !== null ? (
          <button
            onClick={nextQuestion}
            className="px-5 py-2 bg-blue-600 text-white rounded"
          >
            Nästa →
          </button>
        ) : (
          <button className="px-5 py-2 border rounded text-gray-400" disabled>
            Välj ett svar
          </button>
        )}
      </div>
    </div>
  );
}
