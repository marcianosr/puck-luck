import { between, type Rng } from '@/lib/rng';
import { R, W, ZONE_TOP } from './constants';

export interface Point {
  x: number;
  y: number;
}

interface Obstacle extends Point {
  r: number;
}

// Formations are authored on a 360-wide board, then stretched onto the rink.
const BW = 360, CX = BW / 2, CY = 200, G = R * 2 + 6;

const toRink = (p: Point): Point => ({ x: W / 2 + (p.x - CX) * (W / BW) * 1.05, y: 20 + (p.y * (ZONE_TOP - 90)) / 330 });

export function scatter(rng: Rng, out: Point[], n: number, avoid: readonly Obstacle[] = []): Point[] {
  let tries = 0, added = 0;
  while (added < n && tries++ < 5000) {
    const x = between(rng, R + 14, W - R - 14), y = between(rng, 60, ZONE_TOP - 50);
    const clearOfDiscs = out.every(d => Math.hypot(d.x - x, d.y - y) > R * 2 + 8);
    const clearOfObstacles = avoid.every(a => Math.hypot(a.x - x, a.y - y) > a.r + R + 8);
    if (clearOfDiscs && clearOfObstacles) {
      out.push({ x, y });
      added++;
    }
  }
  return out;
}

const authored = (build: () => Point[]) => (): Point[] => build().map(toRink);

export const FORMATIONS: Record<string, (rng: Rng) => Point[]> = {
  'Scatter': rng => scatter(rng, [], 9),
  'Diamond': authored(() => {
    const o: Point[] = [], g = G + 10;
    [1, 2, 3, 2, 1].forEach((n, r) => { for (let i = 0; i < n; i++) o.push({ x: CX + (i - (n - 1) / 2) * g, y: 100 + r * g }); });
    return o;
  }),
  'Ring': authored(() => Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return { x: CX + Math.cos(a) * 100, y: CY + Math.sin(a) * 100 };
  }).concat([{ x: CX, y: CY }])),
  'Rows': authored(() => {
    const o: Point[] = [];
    ([[3, 110], [2, 185], [3, 260]] as const).forEach(([n, y]) => { for (let i = 0; i < n; i++) o.push({ x: CX + (i - (n - 1) / 2) * (G + 50), y }); });
    return o;
  }),
  'Twin Packs': authored(() => {
    const o: Point[] = [];
    const pack = (cx: number, cy: number) => ([[0, 0], [-1, 1], [1, 1], [0, 2]] as const).forEach(([i, j]) => o.push({ x: cx + i * (G / 2 + 6), y: cy + j * G }));
    pack(BW * 0.27, 100);
    pack(BW * 0.73, 200);
    return o;
  }),
  'Arrow': authored(() => {
    const g = G + 8, o: Point[] = [{ x: CX, y: 80 }];
    for (let k = 1; k <= 3; k++) o.push({ x: CX - k * g * 0.75, y: 80 + k * g * 0.85 }, { x: CX + k * g * 0.75, y: 80 + k * g * 0.85 });
    for (let k = 1; k <= 2; k++) o.push({ x: CX, y: 80 + k * g * 1.1 });
    return o;
  }),
  'Corners': authored(() => {
    const o: Point[] = [];
    const corners = [[75, 100], [BW - 75, 100], [75, 300], [BW - 75, 300]] as const;
    corners.forEach(([cx, cy]) => [-G / 2 - 3, G / 2 + 3].forEach(dx => o.push({ x: cx + dx, y: cy })));
    return o;
  }),
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
