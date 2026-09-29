"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,ChevronRight,Clock3,RotateCcw,Undo2,Redo2,Lightbulb,Pause} from "lucide-react";
import {generateLevel,solved,type Mark,type Level} from "@/lib/game";

const TOTAL=1000;
export default function Game(){
 const [levelId,setLevelId]=useState(1),[marks,setMarks]=useState<Mark[]>(()=>Array(36).fill("empty"));
 const [history,setHistory]=useState<Mark[][]>([]),[future,setFuture]=useState<Mark[][]>([]);
 const [seconds,setSeconds]=useState(0),[paused,setPaused]=useState(false),[done,setDone]=useState(false),[hint,setHint]=useState<number|null>(null);
 const level=useMemo(()=>generateLevel(levelId),[levelId]);
 useEffect(()=>{const saved=localStorage.getItem("star-battles-progress");if(saved){const p=JSON.parse(saved);setLevelId(p.level||1)}},[]);
 useEffect(()=>{if(paused||done)return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t)},[paused,done]);
 useEffect(()=>{localStorage.setItem("star-battles-progress",JSON.stringify({level:levelId}))},[levelId]);
 function play(i:number,forceX=false){if(done)return;const next=[...marks];const value=forceX?"x":marks[i]==="star"?"empty":"star";next[i]=value;setHistory(h=>[...h,marks]);setFuture([]);setMarks(next);if(solved(level,new Set(next.flatMap((m,j)=>m==="star"?[j]:[]))))setDone(true)}
 function undo(){if(!history.length)return;const h=[...history],prev=h.pop()!;setFuture(f=>[marks,...f]);setHistory(h);setMarks(prev)}
 function redo(){if(!future.length)return;const f=[...future],next=f.pop()!;setHistory(h=>[...h,marks]);setFuture(f);setMarks(next)}
 function reset(){setMarks(Array(36).fill("empty"));setHistory([]);setFuture([]);setSeconds(0);setDone(false);setHint(null)}
 function hintMe(){const s=level.solution.find(i=>marks[i]!=="star");if(s!==undefined)setHint(s)}
 const fmt=(n:number)=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
 const stars=marks.filter(x=>x==="star").length;
 return <main className="min-h-screen px-4 py-6 md:px-8">
  <div className="mx-auto max-w-6xl">
   <header className="mb-6 flex items-center justify-between"><button className="rounded-xl border border-white/10 p-3"><ArrowLeft size={18}/></button><div className="text-center"><div className="text-xs uppercase tracking-[.25em] text-white/40">Star Battles</div><h1 className="mt-1 text-xl font-semibold">Level {levelId}</h1></div><button onClick={()=>setPaused(!paused)} className="rounded-xl border border-white/10 p-3">{paused?<ChevronRight size={18}/>:<Pause size={18}/>}</button></header>
   <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
    <div className="rounded-3xl border border-white/10 bg-white/[.035] p-3 shadow-2xl md:p-6">
     <div className="mb-4 flex items-center justify-between text-sm text-white/50"><span>{level.difficulty}</span><span>{fmt(seconds)}</span></div>
     <div className="mx-auto grid aspect-square w-full max-w-[680px] grid-cols-6 overflow-hidden rounded-2xl border border-white/15 bg-black/30">
      {marks.map((m,i)=><button key={i} onClick={()=>play(i)} onContextMenu={e=>{e.preventDefault();play(i,true)}} aria-label={`cell ${i+1}`} className={`relative flex items-center justify-center border border-white/[.07] transition hover:bg-white/[.06] ${hint===i?"ring-2 ring-amber-300":""}`}>
       {m==="star"&&<svg viewBox="0 0 100 100" className="h-[55%] w-[55%] fill-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,.25)]"><path d="M50 5 61 38 96 38 68 58 79 92 50 72 21 92 32 58 4 38 39 38Z"/></svg>}
       {m==="x"&&<span className="text-xl text-white/25">×</span>}
      </button>)}
     </div>
     <div className="mt-5 flex flex-wrap justify-center gap-2">
      <button onClick={undo} className="control"><Undo2 size={16}/>Undo</button><button onClick={redo} className="control"><Redo2 size={16}/>Redo</button><button onClick={reset} className="control"><RotateCcw size={16}/>Reset</button><button onClick={hintMe} className="control"><Lightbulb size={16}/>Hint</button>
     </div>
    </div>
    <aside className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="text-xs uppercase tracking-[.2em] text-white/35">Progress</div><div className="mt-2 text-3xl font-semibold">{stars}<span className="text-white/25"> / 6</span></div><div className="mt-1 text-sm text-white/45">stars placed</div></div>
      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="text-xs uppercase tracking-[.2em] text-white/35">Levels</div><div className="mt-2 text-3xl font-semibold">1,000</div><div className="mt-1 text-sm text-white/45">generated puzzles</div></div>
      <div className="flex gap-2"><button disabled={levelId<=1} onClick={()=>{setLevelId(x=>x-1);reset()}} className="control flex-1"><ArrowLeft size={16}/>Prev</button><button disabled={levelId>=TOTAL} onClick={()=>{setLevelId(x=>x+1);reset()}} className="control flex-1">Next<ChevronRight size={16}/></button></div>
    </aside>
   </section>
   {done&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11141a] p-8 text-center shadow-2xl"><div className="text-xs uppercase tracking-[.25em] text-amber-300/70">Completed</div><h2 className="mt-3 text-4xl font-semibold">Level geschafft</h2><p className="mt-3 text-white/50">Zeit {fmt(seconds)} · {stars} Sterne</p><button onClick={()=>{setLevelId(x=>Math.min(TOTAL,x+1));reset()}} className="mt-7 w-full rounded-2xl bg-amber-300 px-5 py-3 font-semibold text-black">Nächstes Level</button></div></div>}
  </div>
  <style jsx global>{`.control{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:.85rem;padding:.65rem .85rem;font-size:.85rem;color:rgba(255,255,255,.75)}.control:hover{background:rgba(255,255,255,.08)}.control:disabled{opacity:.3}`}</style>
 </main>
}
