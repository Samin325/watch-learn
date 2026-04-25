"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

type Chunk = {
  id: string;
  text: string;
  section: string;
  page?: number;
};

type SpeechMark = {
  time: number;
  type: string;
  start: number;
  end: number;
  value: string;
};

const CLB_MIN = 5;
const CLB_MAX = 12;

const CLB_DESCRIPTIONS: Record<number, string> = {
  5: "Initial Intermediate — simple words, short sentences, analogies.",
  6: "Developing Intermediate — everyday words, all terms defined.",
  7: "Adequate Intermediate — short sentences, legal terms glossed.",
  8: "Fluent Intermediate — clear language, technical terms defined inline.",
  9: "Initial Advanced — shorter sentences, low-frequency idioms replaced.",
  10: "Developing Advanced — light simplification, all terminology kept.",
  11: "Adequate Advanced — minimal simplification, dense sentences reduced.",
  12: "Fluent Advanced — original manual text, no changes.",
};

export default function ReaderPage() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [useOriginal, setUseOriginal] = useState(true);
  const [clbLevel, setClbLevel] = useState<number>(8);
  const [densityText, setDensityText] = useState<string>("");
  const [rewriting, setRewriting] = useState(false);
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const marksRef = useRef<SpeechMark[]>([]);

  // Load the chunked manual on mount.
  useEffect(() => {
    fetch("/api/manual")
      .then((r) => r.json())
      .then((d) => setChunks(d.chunks ?? []));
  }, []);

  const active = chunks[activeIdx];

  useEffect(() => {
    if (!active) return;
    if (useOriginal) {
      setDensityText(active.text);
      return;
    }
    const timer = setTimeout(() => {
      setRewriting(true);
      fetch("/api/density", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: active.text, clb: clbLevel }),
      })
        .then((r) => r.json())
        .then((d) => setDensityText(d.text ?? active.text))
        .finally(() => setRewriting(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [active, useOriginal, clbLevel]);

  async function readAloud() {
    if (!active || !densityText) return;
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: densityText, withMarks: true }),
    });
    const data = await res.json();
    marksRef.current = data.marks ?? [];

    const audio = new Audio(`data:${data.contentType};base64,${data.audioBase64}`);
    audioRef.current?.pause();
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      const t = audio.currentTime * 1000;
      const idx = marksRef.current.findIndex(
        (m, i) => m.time <= t && (marksRef.current[i + 1]?.time ?? Infinity) > t
      );
      setActiveSentence(idx >= 0 ? idx : null);
    };
    audio.onended = () => setActiveSentence(null);
    await audio.play().catch(() => {});
  }

  // Split densityText into sentences for the highlight overlay.
  const sentences = splitSentences(densityText);

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10 pb-20">
      {/* Header controls */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <div className="eyebrow mb-2">Pillar III · Manual Reader</div>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            The same content,
            <br />
            <span className="text-slate text-3xl md:text-4xl italic">
              at the level you need.
            </span>
          </h1>
          <p className="mt-3 text-sm text-ink/70 max-w-md">
            The provincial exam is in English, so the manual is in English. Slide
            the CLB level to match your reading comfort — and have it read aloud
            while sentences highlight.
          </p>
        </div>

        <ClbSlider
          value={clbLevel}
          onChange={setClbLevel}
          useOriginal={useOriginal}
          onToggleOriginal={setUseOriginal}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Sidebar: section navigator */}
        <aside className="lg:col-span-3 lg:sticky lg:top-6 self-start max-h-[80vh] overflow-y-auto border border-hair p-4">
          <div className="eyebrow mb-3">Sections</div>
          <ul className="space-y-1">
            {chunks.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setActiveIdx(i);
                    setActiveSentence(null);
                  }}
                  className={`w-full text-left text-sm py-2 px-2 transition ${
                    i === activeIdx ? "bg-ink text-paper" : "hover:bg-ink/5"
                  }`}
                >
                  <div className="font-medium truncate">{c.section}</div>
                  {c.page && (
                    <div className="text-[10px] font-mono opacity-60">
                      p.{c.page}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Reading pane */}
        <article className="lg:col-span-9 border border-hair p-8 md:p-10 bg-paper">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <h2 className="font-display text-3xl leading-tight mb-1">
                {active?.section ?? "—"}
              </h2>
              <div className="text-[10px] font-mono text-slate uppercase tracking-wider">
                {useOriginal
                  ? "Original manual text"
                  : `CLB ${clbLevel} · ${CLB_DESCRIPTIONS[clbLevel]}`}
              </div>
            </div>
            <button
              onClick={readAloud}
              disabled={rewriting || !densityText}
              className="text-xs font-mono px-3 py-2 border border-ink hover:bg-ink hover:text-paper transition flex items-center gap-1.5 shrink-0 disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
              </svg>
              Read aloud
            </button>
          </div>

          <div className="text-base md:text-lg leading-relaxed mt-6 max-w-3xl prose prose-sm md:prose-base max-w-none">
            {rewriting ? (
              <span className="text-slate italic">Rewriting at CLB {clbLevel}…</span>
            ) : activeSentence !== null ? (
              sentences.map((s, i) => (
                <span
                  key={i}
                  className={i === activeSentence ? "tts-active" : ""}
                >
                  {s}{" "}
                </span>
              ))
            ) : (
              <ReactMarkdown>{densityText}</ReactMarkdown>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|\S+$/g) ?? [text];
}

function ClbSlider({
  value,
  onChange,
  useOriginal,
  onToggleOriginal,
}: {
  value: number;
  onChange: (level: number) => void;
  useOriginal: boolean;
  onToggleOriginal: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <button
        onClick={() => onToggleOriginal(!useOriginal)}
        className={`px-3 py-2 text-sm font-mono border transition ${
          useOriginal
            ? "bg-ink text-paper border-ink"
            : "border-hair hover:bg-ink/5"
        }`}
      >
        Original (Manual)
      </button>
      <div className={useOriginal ? "opacity-30 pointer-events-none" : ""}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="eyebrow text-[10px]">CLB Level</span>
          <span className="font-mono text-sm font-medium">{value}</span>
        </div>
        <input
          type="range"
          min={CLB_MIN}
          max={CLB_MAX}
          step={1}
          value={value}
          onChange={(e) => {
            onToggleOriginal(false);
            onChange(Number(e.target.value));
          }}
          className="w-full accent-ink cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate">
          <span>CLB {CLB_MIN}</span>
          <span>CLB {CLB_MAX}</span>
        </div>
      </div>
    </div>
  );
}
