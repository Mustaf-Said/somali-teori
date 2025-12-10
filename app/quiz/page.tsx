"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

//
// 🔵 MODAL KOMPONENT — Måste ligga UTANFÖR QuizPage!
//
function ImageModal({
  image,
  onClose,
}: {
  image: string | null;
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="p-4 bg-white rounded-xl shadow-xl max-w-[90vw] max-h-[80vh]">
        <Image
          src={image}
          alt="Vägmärke stort"
          width={800}
          height={800}
          className="object-contain max-w-[90vw] max-h-[80vh] rounded"
        />
      </div>
    </div>
  );
}


//
// 🔵 QUIZPAGE — Huvudkomponenten
//
interface Question {
  id?: string;
  category?: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  image?: string;
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

  // 🔵 Lägen: meny, träning, prov
  const [mode, setMode] = useState<"menu" | "train" | "test">("menu");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // 🔵 Timer
  const defaultMinutes = 50;
  const defaultSeconds = defaultMinutes * 60;
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultSeconds);
  const intervalRef = useRef<number | null>(null);

  // 🔵 Modal för bildvisning
  const [modalImage, setModalImage] = useState<string | null>(null);

  //
  // 🔵 Hjälpfunktioner
  //
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

  //
  // 🔵 Ladda frågor
  //
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/questions");
      const data = await res.json();
      setQuestions(data);
      setShuffled(shuffle([...data]));
    }
    load();
  }, []);

  const categories = Array.from(new Set(questions.map((q) => q.category))).filter(Boolean) as string[];

  //
  // 🔵 Återställ sparad state
  //
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    queueMicrotask(() => loadSavedState(parsed));
  }, []);

  //
  // 🔵 Timer
  //
  useEffect(() => {
    if (!started) {
      return undefined; // <- FIX
    }

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


  //
  // 🔵 Autospara state
  //
  useEffect(() => {
    const state = { started, timeLeft, current, score, shuffled };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [started, timeLeft, current, score, shuffled]);

  //
  // 🔵 Quizkontroller
  //
  function startQuiz() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setTimeLeft(defaultSeconds);
    setStarted(true);
  }

  function handleAnswer(idx: number) {
    if (selected !== null || finished) return;

    setSelected(idx);
    if (idx === shuffled[current].answer) setScore((s) => s + 1);
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

  //
  // 🔵 MENY
  //
  if (mode === "menu") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-4">Somali Teori — Körkort B</h1>
          <p className="mb-6">Välj ett läge</p>

          <button
            onClick={() => setMode("train")}
            className="w-full py-4 bg-blue-600 text-white rounded-lg mb-4"
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
            className="w-full py-4 bg-green-600 text-white rounded-lg"
          >
            Gör testprov (70 frågor)
          </button>
        </div>
      </div>
    );
  }

  //
  // 🔵 Välj kategori för träning
  //
  if (mode === "train" && !selectedCategoryName) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-6">Välj kategori att träna</h1>

        <div className="flex flex-col gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              className="py-3 border rounded hover:bg-gray-100"
              onClick={() => {
                const items = questions.filter((q) => q.category === cat);
                setShuffled(shuffle(items));
                setSelectedCategoryName(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button onClick={() => setMode("menu")} className="mt-4 underline">
          Tillbaka
        </button>
      </div>
    );
  }

  //
  // 🔵 Starta träningen
  //
  if (!started && mode === "train" && selectedCategoryName) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">{selectedCategoryName}</h2>

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
          className="mt-4 underline"
        >
          Tillbaka
        </button>
      </div>
    );
  }

  //
  // 🔵 QUIZ AVSLUTAD
  //
  if (finished) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Klart!</h1>

        <p className="text-lg mb-3">
          Poäng: <b>{score}</b> av {shuffled.length}
        </p>

        <p className="mb-6">Tid kvar: {formatTime(timeLeft)}</p>

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

  //
  // 🔵 QUIZVISNING
  //
  const q = shuffled[current];
  const percent = Math.round((timeLeft / defaultSeconds) * 100);

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* 🔵 MODAL */}
      <ImageModal image={modalImage} onClose={() => setModalImage(null)} />

      <div className="flex justify-between mb-4">
        <div>Fråga {current + 1} / {shuffled.length}</div>
        <div className="font-mono">{formatTime(timeLeft)}</div>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded mb-4">
        <div className="h-full bg-green-500" style={{ width: `${percent}%` }}></div>
      </div>

      <h2 className="text-xl font-semibold mb-3">{q.question}</h2>

      {/* 🔵 VISA BILD OM DEN FINNS */}
      {q.image && (
        <div className="my-4 flex justify-center">
          <Image
            src={q.image}
            alt="Vägmärke"
            width={260}
            height={260}
            className="rounded border cursor-pointer hover:scale-105 transition"
            onClick={() => q.image && setModalImage(q.image)}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {q.options.map((opt, idx) => {
          const correct = idx === q.answer;
          const isSelected = idx === selected;

          let styles = "border p-3 rounded cursor-pointer";
          if (selected !== null) {
            if (correct) styles += " bg-green-300";
            else if (isSelected) styles += " bg-red-300";
          }

          return (
            <button
              key={idx}
              disabled={selected !== null}
              onClick={() => handleAnswer(idx)}
              className={styles}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div /* className="flex justify-end mt-6" */>
        {selected !== null ? (
          <div className="flex justify-between">
            <button onClick={() => setMode("menu")} className="mt-2 underline">
              Tillbaka
            </button>
            <button onClick={nextQuestion} className="px-5 py-2 bg-blue-600 text-white rounded mt-2">
              Nästa →
            </button>
          </div>
        ) : (
          <div className="flex justify-between">
            <button onClick={() => setMode("menu")} className="mt-2 underline">
              Tillbaka
            </button>
            <button className="px-5 py-2 border rounded text-gray-400 mt-2" disabled>
              Välj ett svar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
