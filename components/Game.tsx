"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock3, Grid3X3, Lightbulb,
  Pause, Play, Redo2, RotateCcw, Search, Settings2, Trophy, Undo2, X
} from "lucide-react";
import { generateLevel, solved, totalLevels, type Difficulty, type Mark } from "@/lib/game";

const SIZE = 6;
const EMPTY = () => Array<Mark>(SIZE * SIZE).fill("empty");
const REGION_STYLES = [
  "rgba(99,102,241,.10)",
  "rgba(14,165,233,.09)",
  "rgba(16,185,129,.09)",
  "rgba(245,158,11,.09)",
  "rgba(236,72,153,.09)",
  "rgba(139,92,246,.10)"
];
const difficultyStyles: Record<Difficulty, string> = {
  Easy: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  Medium: "text-sky-300 bg-sky-400/10 border-sky-400/20",
  Hard: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  Expert: "text-rose-300 bg-rose-400/10 border-rose-400/20"
};

export default function Game() {
  const [levelId, setLevelId] = useState(1);
  const [marks, setMarks] = useState<Mark[]>(EMPTY);
  const [history, setHistory] = useState<Mark[][]>([]);
  const [future, setFuture] = useState<Mark[][]>([]);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [bestTimes, setBestTimes] = useState<Record<string, number>>({});
  const [hint, setHint] = useState<number | null>(null);
  const [screen, setScreen] = useState<"game" | "levels">("game");
  const [search, setSearch] = useState("");
  const [tool, setTool] = useState<"star" | "dot" | "x">("star");

  const level = useMemo(() => generateLevel(levelId), [levelId]);
  const starCount = marks.filter(x => x === "star").length;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  useEffect(() => {
    const saved = localStorage.getItem("star-battles-state");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (Number.isInteger(data.level)) setLevelId(Math.min(totalLevels(), Math.max(1, data.level)));
      if (Array.isArray(data.marks) && data.marks.length === 36) setMarks(data.marks);
      if (Number.isFinite(data.seconds)) setSeconds(data.seconds);
      if (Array.isArray(data.completedLevels)) setCompletedLevels(data.completedLevels);
      if (data.bestTimes && typeof data.bestTimes === "object") setBestTimes(data.bestTimes);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("star-battles-state", JSON.stringify({ level: levelId, marks, seconds, completedLevels, bestTimes }));
  }, [levelId, marks, seconds, completedLevels, bestTimes]);

  useEffect(() => {
    if (paused || complete || screen !== "game") return;
    const timer = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused, complete, screen]);

  function loadLevel(id: number) {
    setLevelId(Math.max(1, Math.min(totalLevels(), id)));
    setMarks(EMPTY());
    setHistory([]);
    setFuture([]);
    setSeconds(0);
    setPaused(false);
    setComplete(false);
    setHint(null);
    setScreen("game");
  }

  function commit(next: Mark[]) {
    setHistory(h => [...h, marks]);
    setFuture([]);
    setMarks(next);
    setHint(null);
    if (solved(level, new Set(next.flatMap((m, i) => m === "star" ? [i] : [])))) {
      setComplete(true);
      setCompletedLevels(done => done.includes(levelId) ? done : [...done, levelId]);
      setBestTimes(times => {
        const previous = times[String(levelId)];
        return previous === undefined || seconds < previous ? { ...times, [String(levelId)]: seconds } : times;
      });
    }
  }

  function toggleCell(i: number) {
    if (paused || complete) return;
    const next = [...marks];
    next[i] = next[i] === tool ? "empty" : tool;
    commit(next);
  }

  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setFuture([marks, ...future]);
    setMarks(previous);
    setComplete(false);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setFuture(future.slice(1));
    setHistory([...history, marks]);
    setMarks(next);
  }

  function reset() {
    setMarks(EMPTY()); setHistory([]); setFuture([]); setSeconds(0); setComplete(false); setHint(null);
  }

  function hasConflict(i: number) {
    if (marks[i] !== "star") return false;
    const stars = new Set(marks.flatMap((m, cell) => m === "star" ? [cell] : []));
    const row = Math.floor(i / SIZE), col = i % SIZE;
    const region = level.regions[i];
    const rowCount = [...stars].filter(cell => Math.floor(cell / SIZE) === row).length;
    const colCount = [...stars].filter(cell => cell % SIZE === col).length;
    const regionCount = [...stars].filter(cell => level.regions[cell] === region).length;
    return rowCount > 1 || colCount > 1 || regionCount > 1 ||
      [...stars].some(cell => cell !== i && Math.abs(Math.floor(cell / SIZE) - row) <= 1 && Math.abs((cell % SIZE) - col) <= 1);
  }

  function giveHint() {
    const target = level.solution.find(cell => marks[cell] !== "star");
    if (target !== undefined) setHint(target);
  }

  const levelNumbers = useMemo(() => {
    const query = search.trim();
    if (!query) return Array.from({ length: 60 }, (_, i) => i + 1);
    const n = Number(query);
    if (!Number.isInteger(n) || n < 1 || n > totalLevels()) return [];
    return Array.from({ length: 21 }, (_, i) => n - 10 + i).filter(x => x >= 1 && x <= totalLevels());
  }, [search]);

  if (screen === "levels") return (
    <main className="min-h-screen bg-[#07090d] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-4">
          <button onClick={() => setScreen("game")} className="iconButton" aria-label="Back"><ArrowLeft size={19}/></button>
          <div><p className="eyebrow">Star Battles</p><h1 className="text-2xl font-semibold">Level auswählen</h1></div>
        </header>
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3">
          <Search size={18} className="text-white/35"/>
          <input value={search} onChange={e => setSearch(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Level 1–1000 suchen" className="w-full bg-transparent outline-none placeholder:text-white/25"/>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
          {levelNumbers.map(n => {
            const d = generateLevel(n).difficulty;
            return <button key={n} onClick={() => loadLevel(n)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[.06] ${n===levelId?"border-amber-300/60 bg-amber-300/10":"border-white/10 bg-white/[.025]"}`}>
              <span className="flex items-center justify-between text-sm font-semibold">#{n}{completedLevels.includes(n) && <Trophy size={13} className="text-amber-300" />}</span><span className={`mt-2 block w-fit rounded-full border px-2 py-0.5 text-[10px] ${difficultyStyles[d]}`}>{d}</span>
            </button>
          })}
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#07090d] px-4 py-5 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-300 text-black"><Grid3X3 size={20}/></div><div><p className="eyebrow">Star Battles</p><h1 className="font-semibold">Level {levelId}</h1></div></div>
          <div className="flex gap-2"><button onClick={() => setScreen("levels")} className="iconButton" title="Levels"><Grid3X3 size={18}/></button><button onClick={() => setPaused(!paused)} className="iconButton" title="Pause">{paused?<Play size={18}/>:<Pause size={18}/>}</button></div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[28px] border border-white/10 bg-white/[.035] p-3 shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className={`rounded-full border px-3 py-1 text-xs ${difficultyStyles[level.difficulty]}`}>{level.difficulty}</span>
              <span className="flex items-center gap-2 text-sm text-white/45"><Clock3 size={15}/>{fmt(seconds)}</span>
            </div>
            <div className="mx-auto grid aspect-square w-full max-w-[650px] grid-cols-6 overflow-hidden rounded-2xl border border-white/20 bg-[#0a0c11] select-none touch-none">
              {marks.map((mark, i) => {
                const region = level.regions[i];
                const row = Math.floor(i / SIZE), col = i % SIZE;

                const top = row === 0 || level.regions[i - SIZE] !== region;
                const bottom = row === SIZE - 1 || level.regions[i + SIZE] !== region;
                const left = col === 0 || level.regions[i - 1] !== region;
                const right = col === SIZE - 1 || level.regions[i + 1] !== region;
                const isRegionStart = i === level.regions.findIndex(value => value === region);
                const outline = [
                  top ? "inset 0 3px 0 rgba(255,255,255,.62)" : "inset 0 1px 0 rgba(255,255,255,.08)",
                  bottom ? "inset 0 -3px 0 rgba(255,255,255,.62)" : "inset 0 -1px 0 rgba(255,255,255,.08)",
                  left ? "inset 3px 0 0 rgba(255,255,255,.62)" : "inset 1px 0 0 rgba(255,255,255,.08)",
                  right ? "inset -3px 0 0 rgba(255,255,255,.62)" : "inset -1px 0 0 rgba(255,255,255,.08)"
                ].join(", ");
                return <button
                  key={i}
                  type="button"
                  onPointerDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCell(i);
                  }}
                  onTouchStart={e => e.preventDefault()}
                  onContextMenu={e => e.preventDefault()}
                  onDragStart={e => e.preventDefault()}
                  style={{ backgroundColor: REGION_STYLES[region], boxShadow: outline, touchAction: "none", WebkitUserSelect: "none" }}
                  className={`relative flex min-h-0 min-w-0 select-none touch-none items-center justify-center overflow-hidden border-0 p-0 transition hover:brightness-125 active:brightness-110 ${hint===i?"ring-2 ring-inset ring-amber-300":""}`}
                  tabIndex={-1}
                  aria-label={`Cell ${i+1}${isRegionStart ? ", region " + (region + 1) : ""}`}
                >
                  {mark==="star" && <span className={`text-4xl leading-none drop-shadow-[0_0_14px_rgba(251,191,36,.35)] ${hasConflict(i) ? "text-rose-300" : "text-amber-300"}`}>★</span>}
                  {mark==="dot" && <span className="h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,.25)]" />}
                  {mark==="x" && <X size={22} className="text-white/25"/>}
                </button>
              })}
            </div>
            <div className="mb-3 flex justify-center gap-2">
              <button type="button" onClick={() => setTool("star")} className={`control ${tool === "star" ? "border-amber-300/50 bg-amber-300/10 text-amber-200" : ""}`}>★ Stern</button>
              <button type="button" onClick={() => setTool("dot")} className={`control ${tool === "dot" ? "border-white/30 bg-white/10 text-white" : ""}`}><span className="h-2 w-2 rounded-full bg-current" /> Punkt</button>
              <button type="button" onClick={() => setTool("x")} className={`control ${tool === "x" ? "border-white/30 bg-white/10 text-white" : ""}`}><X size={16}/> X</button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button className="control" onClick={undo} disabled={!history.length}><Undo2 size={16}/>Undo</button>
              <button className="control" onClick={redo} disabled={!future.length}><Redo2 size={16}/>Redo</button>
              <button className="control" onClick={reset}><RotateCcw size={16}/>Reset</button>
              <button className="control" onClick={giveHint}><Lightbulb size={16}/>Hint</button>
            </div>
            <p className="mt-4 text-center text-xs text-white/30">Werkzeug auswählen · Stern, Punkt oder X setzen · Sterne dürfen sich nicht berühren</p>
          </div>

          <aside className="space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[.035] p-5"><p className="eyebrow">Progress</p><div className="mt-2 text-3xl font-semibold">{starCount}<span className="text-white/20"> / 6</span></div><p className="mt-1 text-sm text-white/40">Sterne gesetzt</p></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[.035] p-5"><p className="eyebrow">Dein Fortschritt</p><div className="mt-2 text-2xl font-semibold">{completedLevels.length}<span className="text-base text-white/25"> / 1000</span></div><p className="mt-1 text-sm text-white/40">Level abgeschlossen</p></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[.035] p-5"><p className="eyebrow">Puzzle</p><div className="mt-2 text-2xl font-semibold">#{levelId} <span className="text-base text-white/30">/ 1000</span></div><p className="mt-1 text-sm text-white/40">6 × 6 · 1 Stern je Zeile, Spalte & Region</p></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[.035] p-5"><p className="eyebrow">Navigation</p><div className="mt-3 grid grid-cols-2 gap-2"><button className="control" disabled={levelId===1} onClick={()=>loadLevel(levelId-1)}><ChevronLeft size={16}/>Zurück</button><button className="control" disabled={levelId===totalLevels()} onClick={()=>loadLevel(levelId+1)}>Weiter<ChevronRight size={16}/></button></div></div>
          </aside>
        </section>

        {paused && <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-5 backdrop-blur-md"><div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#11141a] p-8 text-center"><Pause className="mx-auto text-white/50" size={28}/><h2 className="mt-4 text-2xl font-semibold">Pausiert</h2><button onClick={()=>setPaused(false)} className="mt-6 w-full rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-black">Fortsetzen</button></div></div>}

        {complete && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-md"><div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-[#11141a] p-8 text-center shadow-2xl"><Trophy className="mx-auto text-amber-300" size={32}/><p className="eyebrow mt-4">Puzzle gelöst</p><h2 className="mt-2 text-4xl font-semibold">Stark!</h2><p className="mt-3 text-white/45">Level {levelId} · {fmt(seconds)} · {starCount} Sterne</p>{bestTimes[String(levelId)] !== undefined && <p className="mt-1 text-xs text-amber-300/70">Bestzeit: {fmt(bestTimes[String(levelId)])}</p>}<button onClick={()=>loadLevel(Math.min(totalLevels(), levelId+1))} className="mt-7 w-full rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-black">Nächstes Level</button></div></div>}
      </div>
      <style jsx global>{`
        .eyebrow{font-size:.68rem;text-transform:uppercase;letter-spacing:.2em;color:rgba(255,255,255,.35)}
        .iconButton{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.75);transition:.15s}
        .iconButton:hover{background:rgba(255,255,255,.08)}
        .control{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:14px;padding:.68rem .9rem;font-size:.84rem;color:rgba(255,255,255,.78);transition:.15s}
        .control:hover:not(:disabled){background:rgba(255,255,255,.08)}
        .control:disabled{opacity:.28}
      `}</style>
    </main>
  );
}
