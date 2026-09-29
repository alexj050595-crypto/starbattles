export type Mark = "empty" | "star" | "x";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type Level = {
  id:number; size:number; starsPerUnit:number; regions:number[]; solution:number[]; difficulty:Difficulty;
};

export function index(r:number,c:number,n:number){return r*n+c}
export function neighbors(i:number,n:number){
  const r=Math.floor(i/n),c=i%n, out:number[]=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue; const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<n&&cc>=0&&cc<n)out.push(index(rr,cc,n));
  } return out;
}
export function validStars(level:Level, stars:Set<number>){
  const {size:n,starsPerUnit:k}=level;
  for(let r=0;r<n;r++) if([...stars].filter(i=>Math.floor(i/n)===r).length>k)return false;
  for(let c=0;c<n;c++) if([...stars].filter(i=>i%n===c).length>k)return false;
  const counts=new Array(n).fill(0);
  for(const i of stars) counts[level.regions[i]]++;
  if(counts.some(x=>x>k))return false;
  for(const i of stars) for(const j of neighbors(i,n)) if(stars.has(j))return false;
  return true;
}
export function solved(level:Level,stars:Set<number>){
  if(!validStars(level,stars)||stars.size!==level.size*level.starsPerUnit)return false;
  const n=level.size,k=level.starsPerUnit;
  for(let r=0;r<n;r++)if([...stars].filter(i=>Math.floor(i/n)===r).length!==k)return false;
  for(let c=0;c<n;c++)if([...stars].filter(i=>i%n===c).length!==k)return false;
  const counts=new Array(n).fill(0); for(const i of stars)counts[level.regions[i]]++;
  return counts.every(x=>x===k);
}

function seeded(seed:number){let x=seed|0;return()=>{x=Math.imul(1664525,x)+1013904223|0;return(x>>>0)/4294967296}}
export function generateLevel(id:number):Level{
  const n=6,k=1,rand=seeded(id*7919+17);
  const cells=Array.from({length:n*n},(_,i)=>i);
  let solution:number[]=[];
  for(let tries=0;tries<5000&&!solution.length;tries++){
    const order=[...cells].sort(()=>rand()-.5),chosen=new Set<number>();
    for(const i of order){if(validStars({id,size:n,starsPerUnit:k,regions:regionsFor(id),solution:[],difficulty:"Easy"},chosen)){chosen.add(i);if(chosen.size===n)break;}}
    if(chosen.size===n)solution=[...chosen];
  }
  if(solution.length!==n) solution=[0,2,9,13,20,31];
  const difficulty:id%4===0?"Easy":id%4===1?"Medium":id%4===2?"Hard":"Expert";
  return {id,size:n,starsPerUnit:k,regions:regionsFor(id),solution,difficulty};
}
function regionsFor(id:number){
  const n=6, regions=new Array(36).fill(0);
  const variants=[
    [0,0,0,1,1,1,0,0,2,2,1,1,3,2,2,2,3,3,3,3,4,4,4,5,4,4,4,5,5,5,4,4,5,5,5,5],
    [0,0,1,1,1,1,0,2,2,1,1,1,0,2,2,3,3,1,4,2,2,3,3,3,4,4,5,5,3,3,4,4,5,5,5,5]
  ];
  const v=variants[id%variants.length];
  for(let i=0;i<36;i++)regions[i]=v[i%v.length];
  return regions;
}
