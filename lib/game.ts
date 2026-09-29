export type Mark = "empty" | "star" | "dot" | "x";
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

export function validStars(level: Level, stars: Set<number>) {
  const n = level.size;
  const rows = new Array(n).fill(0);
  const cols = new Array(n).fill(0);
  const regions = new Array(n).fill(0);

  for (const cell of stars) {
    const row = Math.floor(cell / n);
    const col = cell % n;
    const region = level.regions[cell];

    rows[row]++;
    cols[col]++;
    regions[region]++;

    if (rows[row] > level.starsPerUnit || cols[col] > level.starsPerUnit || regions[region] > level.starsPerUnit) return false;
    if (neighbors(cell, n).some(other => stars.has(other))) return false;
  }

  return true;
}

export function solved(level: Level, stars: Set<number>) {
  if (stars.size !== level.size * level.starsPerUnit || !validStars(level, stars)) return false;

  const rows = new Array(level.size).fill(0);
  const cols = new Array(level.size).fill(0);
  const regions = new Array(level.size).fill(0);

  for (const cell of stars) {
    rows[Math.floor(cell / level.size)]++;
    cols[cell % level.size]++;
    regions[level.regions[cell]]++;
  }

  return rows.every(count => count === level.starsPerUnit)
    && cols.every(count => count === level.starsPerUnit)
    && regions.every(count => count === level.starsPerUnit);
}

export function countSolutions(level: Level, limit = 2) {
  let count = 0;
  const placed: number[] = [];
  const usedColumns = new Set<number>();
  const usedRegions = new Set<number>();

  function search(row: number) {
    if (count >= limit) return;
    if (row === level.size) {
      count++;
      return;
    }

    for (let col = 0; col < level.size; col++) {
      const cell = index(row, col, level.size);
      const region = level.regions[cell];

      if (usedColumns.has(col) || usedRegions.has(region)) continue;
      if (placed.some(other => neighbors(other, level.size).includes(cell))) continue;

      placed.push(cell);
      usedColumns.add(col);
      usedRegions.add(region);
      search(row + 1);
      placed.pop();
      usedColumns.delete(col);
      usedRegions.delete(region);

      if (count >= limit) return;
    }
  }

  search(0);
  return count;
}

function makeSolution(random: () => number) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const solution: number[] = [];
    const usedColumns = new Set<number>();

    for (let row = 0; row < SIZE; row++) {
      const candidates = Array.from({ length: SIZE }, (_, col) => index(row, col))
        .filter(cell => {
          if (usedColumns.has(cell % SIZE)) return false;
          return !solution.some(other => neighbors(other).includes(cell));
        })
        .sort(() => random() - 0.5);

      if (!candidates.length) break;

      const cell = candidates[0];
      solution.push(cell);
      usedColumns.add(cell % SIZE);
    }

    if (solution.length === SIZE) return solution;
  }

  return null;
}

/**
 * Creates six connected regions of exactly six cells.
 * Every region starts at exactly one solution star, so the
 * generated solution automatically contains one star per region.
 */
function makeRegions(random: () => number, seeds: number[]) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const regions = new Array(SIZE * SIZE).fill(-1);
    const sizes = new Array(SIZE).fill(0);

    seeds.forEach((seed, region) => {
      regions[seed] = region;
      sizes[region] = 1;
    });

    while (sizes.some(size => size < SIZE)) {
      const candidates: Array<{ region: number; cell: number; score: number }> = [];

      for (let region = 0; region < SIZE; region++) {
        if (sizes[region] >= SIZE) continue;

        const frontier = new Set<number>();

        for (let cell = 0; cell < regions.length; cell++) {
          if (regions[cell] !== region) continue;
          for (const next of neighbors(cell, SIZE, false)) {
            if (regions[next] === -1) frontier.add(next);
          }
        }

        for (const cell of frontier) {
          const sameNeighbours = neighbors(cell, SIZE, false)
            .filter(next => regions[next] === region).length;
          candidates.push({ region, cell, score: sameNeighbours });
        }
      }

      if (!candidates.length) break;

      const minimumSize = Math.min(...candidates.map(candidate => sizes[candidate.region]));
      const balanced = candidates.filter(candidate => sizes[candidate.region] <= minimumSize + 1);

      balanced.sort((a, b) => b.score - a.score || random() - 0.5);
      const pool = balanced.slice(0, Math.max(1, Math.ceil(balanced.length * 0.35)));
      const chosen = pool[Math.floor(random() * pool.length)];

      regions[chosen.cell] = chosen.region;
      sizes[chosen.region]++;
    }

    if (sizes.every(size => size === SIZE) && regions.every(region => region >= 0)) {
      return regions;
    }
  }

  return null;
}

function difficultyFor(id: number, solutionCount: number): Difficulty {
  if (id <= 150) return "Easy";
  if (id <= 400) return "Medium";
  if (id <= 700) return solutionCount === 1 ? "Hard" : "Medium";
  return solutionCount === 1 ? "Expert" : "Hard";
}

export function generateLevel(id: number): Level {
  const safeId = Math.max(1, Math.min(TOTAL, Math.floor(id)));
  const cached = cache.get(safeId);
  if (cached) return cached;

  const random = rng(safeId * 2654435761);

  for (let attempt = 0; attempt < 400; attempt++) {
    const solution = makeSolution(random);
    if (!solution) continue;

    const regions = makeRegions(random, solution);
    if (!regions) continue;

    const candidate: Level = {
      id: safeId,
      size: SIZE,
      starsPerUnit: 1,
      regions,
      solution,
      difficulty: "Easy"
    };

    const solutionCount = countSolutions(candidate);
    candidate.difficulty = difficultyFor(safeId, solutionCount);

    // The generated solution is always valid. Prefer unique puzzles,
    // but keep valid puzzles as a fallback so every level is playable.
    if (solutionCount === 1 || attempt === 399) {
      cache.set(safeId, candidate);
      return candidate;
    }
  }

  throw new Error("Could not generate Star Battles level.");
}

export function totalLevels() {
  return TOTAL;
}
