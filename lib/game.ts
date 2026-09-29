export type Mark = "empty" | "star" | "x";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type Level = {
  id: number;
  size: number;
  starsPerUnit: number;
  regions: number[];
  solution: number[];
  difficulty: Difficulty;
};

const SIZE = 6;
const TOTAL = 1000;
const cache = new Map<number, Level>();

const dirs = [-1, 0, 1];

function rng(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = Math.imul(1664525, x) + 1013904223;
    return (x >>> 0) / 4294967296;
  };
}

export function index(row: number, col: number, n = SIZE) {
  return row * n + col;
}

export function neighbors(cell: number, n = SIZE, diagonal = true) {
  const row = Math.floor(cell / n);
  const col = cell % n;
  const result: number[] = [];
  for (const dr of dirs) for (const dc of dirs) {
    if (!dr && !dc) continue;
    if (!diagonal && dr !== 0 && dc !== 0) continue;
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < n && c >= 0 && c < n) result.push(index(r, c, n));
  }
  return result;
}

function compatible(level: Pick<Level, "size" | "regions" | "starsPerUnit">, placed: number[], cell: number) {
  const n = level.size;
  const row = Math.floor(cell / n);
  const col = cell % n;
  if (placed.some(p => Math.floor(p / n) === row || p % n === col)) return false;
  if (placed.some(p => neighbors(p, n).includes(cell))) return false;
  const region = level.regions[cell];
  if (placed.filter(p => level.regions[p] === region).length >= level.starsPerUnit) return false;
  return true;
}

export function validStars(level: Level, stars: Set<number>) {
  const n = level.size, k = level.starsPerUnit;
  const rows = new Array(n).fill(0);
  const cols = new Array(n).fill(0);
  const regions = new Array(n).fill(0);
  for (const cell of stars) {
    rows[Math.floor(cell / n)]++;
    cols[cell % n]++;
    regions[level.regions[cell]]++;
    if (rows[Math.floor(cell / n)] > k || cols[cell % n] > k || regions[level.regions[cell]] > k) return false;
    if (neighbors(cell, n).some(nbr => stars.has(nbr))) return false;
  }
  return true;
}

export function solved(level: Level, stars: Set<number>) {
  if (stars.size !== level.size * level.starsPerUnit || !validStars(level, stars)) return false;
  const n = level.size, k = level.starsPerUnit;
  const rows = new Array(n).fill(0), cols = new Array(n).fill(0), regions = new Array(n).fill(0);
  for (const cell of stars) {
    rows[Math.floor(cell / n)]++;
    cols[cell % n]++;
    regions[level.regions[cell]]++;
  }
  return rows.every(x => x === k) && cols.every(x => x === k) && regions.every(x => x === k);
}

export function countSolutions(level: Level, limit = 2) {
  const n = level.size;
  let count = 0;
  const placed: number[] = [];
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function search(row: number) {
    if (count >= limit) return;
    if (row === n) { count++; return; }
    for (let col = 0; col < n; col++) {
      const cell = index(row, col, n);
      if (usedCols.has(col) || usedRegions.has(level.regions[cell])) continue;
      if (placed.some(p => neighbors(p, n).includes(cell))) continue;
      placed.push(cell); usedCols.add(col); usedRegions.add(level.regions[cell]);
      search(row + 1);
      placed.pop(); usedCols.delete(col); usedRegions.delete(level.regions[cell]);
      if (count >= limit) return;
    }
  }
  search(0);
  return count;
}

function solutionFor(random: () => number) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const placed: number[] = [];
    const cols = new Set<number>();
    for (let row = 0; row < SIZE; row++) {
      const candidates = Array.from({ length: SIZE }, (_, col) => index(row, col))
        .filter(cell => !cols.has(cell % SIZE) && !placed.some(p => neighbors(p).includes(cell)))
        .sort(() => random() - 0.5);
      const cell = candidates[0];
      if (cell === undefined) break;
      placed.push(cell);
      cols.add(cell % SIZE);
    }
    if (placed.length === SIZE) return placed;
  }
  return null;
}

function makeRegions(random: () => number, seeds: number[]) {
  const regions = new Array(SIZE * SIZE).fill(-1);
  const frontier: { cell: number; region: number }[] = [];
  seeds.forEach((seed, region) => { regions[seed] = region; });
  seeds.forEach((seed, region) => frontier.push(...neighbors(seed).map(cell => ({ cell, region }))));
  while (frontier.length) {
    const order = frontier.map((_, i) => i).sort(() => random() - 0.5);
    let picked = -1;
    for (const pos of order) {
      const item = frontier[pos];
      if (regions[item.cell] === -1) { picked = pos; break; }
    }
    if (picked < 0) break;
    const item = frontier.splice(picked, 1)[0];
    if (regions[item.cell] !== -1) continue;
    regions[item.cell] = item.region;
    for (const cell of neighbors(item.cell)) if (regions[cell] === -1) frontier.push({ cell, region: item.region });
  }
  for (let cell = 0; cell < regions.length; cell++) if (regions[cell] === -1) regions[cell] = cell % SIZE;
  return regions;
}

function difficultyFor(id: number): Difficulty {
  if (id <= 150) return "Easy";
  if (id <= 400) return "Medium";
  if (id <= 700) return "Hard";
  return "Expert";
}

export function generateLevel(id: number): Level {
  if (cache.has(id)) return cache.get(id)!;
  const safeId = Math.max(1, Math.min(TOTAL, id));
  const random = rng(safeId * 2654435761);
  let best: Level | null = null;

  for (let attempt = 0; attempt < 250 && !best; attempt++) {
    const seeds = new Set<number>();
    while (seeds.size < SIZE) seeds.add(Math.floor(random() * SIZE * SIZE));
    const solution = solutionFor(random);
    if (!solution) continue;
    const regions = makeRegions(random, solution);
    const candidate: Level = {
      id: safeId, size: SIZE, starsPerUnit: 1, regions, solution,
      difficulty: difficultyFor(safeId)
    };
    if (countSolutions(candidate) === 1) best = candidate;
  }

  if (!best) {
    const solution = [0, 8, 16, 24, 32, 34];
    const regions = solution.map((_, region) => region);
    const fallbackRegions = Array.from({ length: SIZE * SIZE }, (_, cell) => {
      const row = Math.floor(cell / SIZE);
      const col = cell % SIZE;
      if (solution.includes(cell)) return solution.indexOf(cell);
      return (row + col) % SIZE;
    });
    best = { id: safeId, size: SIZE, starsPerUnit: 1, regions: fallbackRegions, solution, difficulty: difficultyFor(safeId) };
  }

  cache.set(safeId, best);
  return best;
}

export function totalLevels() { return TOTAL; }
