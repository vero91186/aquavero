'use client';

import { useMemo, useState } from 'react';
import type { DensityLine, DensityLevelId } from '@/lib/density';

// Vue de face du bac, à l'échelle : chaque animal est dessiné à sa taille
// adulte réelle par rapport à la longueur de l'aquarium, ce qui permet de
// « voir » la place qu'il reste. Les positions sont tirées au hasard mais
// de façon stable (graine fixe), pour que le dessin ne saute pas à chaque clic.

const PALETTE = ['#3d7ea6', '#d9734a', '#e0a23a', '#7a6bb5', '#4f9d8a', '#c0577a', '#6f8f3c', '#b0794a'];
const MAX_DRAWN_PER_LINE = 60;

const WATER: Record<DensityLevelId, { top: string; bottom: string }> = {
  aere: { top: '#cfe9ea', bottom: '#8fc7c5' },
  raisonnable: { top: '#cde5e0', bottom: '#86bdb0' },
  charge: { top: '#dcdcae', bottom: '#b3b073' },
  surcharge: { top: '#d9c8a0', bottom: '#b08f5e' },
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const ZONE_BAND: Record<'top' | 'mid' | 'bottom', [number, number]> = {
  top: [0.06, 0.34],
  mid: [0.3, 0.7],
  bottom: [0.66, 0.9],
};

interface Sprite {
  key: string;
  x: number;
  y: number;
  len: number; // longueur en unités du dessin (1 cm = 10 unités)
  flip: boolean;
  color: string;
  type: 'fish' | 'shrimp' | 'snail';
  hypothetical: boolean;
}

function layout(lines: DensityLine[], W: number, H: number, substrate: number): Sprite[] {
  const water = H - substrate;
  const sprites: Sprite[] = [];
  const placed: { x: number; y: number; r: number }[] = [];

  lines.forEach((line, li) => {
    const count = Math.min(Math.max(0, Math.round(line.quantity)), MAX_DRAWN_PER_LINE);
    if (count === 0 || line.sizeCm <= 0) return;
    const rand = rng(hash(line.name) + li * 97);
    const len = line.sizeCm * 10;
    const snail = line.kind === 'invertebrate' && /neritin|clithon|escargot|planorb|physe|n[ée]rite|helen|mol+usque|snail/i.test(line.name);
    const type: Sprite['type'] = line.kind === 'fish' ? 'fish' : snail ? 'snail' : 'shrimp';
    const zone = line.kind === 'invertebrate' ? 'bottom' : (line.zone ?? 'mid');
    const [z0, z1] = ZONE_BAND[zone];
    const color = PALETTE[li % PALETTE.length];

    for (let i = 0; i < count; i++) {
      let best = { x: 0, y: 0 };
      for (let attempt = 0; attempt < 30; attempt++) {
        const x = len / 2 + rand() * (W - len);
        const y = (z0 + rand() * (z1 - z0)) * water;
        best = { x, y };
        const r = len * 0.45;
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r)) break;
      }
      placed.push({ x: best.x, y: best.y, r: len * 0.45 });
      sprites.push({
        key: `${line.id}-${i}`,
        x: best.x,
        y: type === 'fish' ? best.y : water - len * 0.12,
        len,
        flip: rand() > 0.5,
        color,
        type,
        hypothetical: !!line.hypothetical,
      });
    }
  });
  return sprites;
}

function Fish({ s }: { s: Sprite }) {
  const h = s.len * 0.3;
  const body = s.len * 0.78;
  const tail = s.len * 0.3;
  const dir = s.flip ? -1 : 1;
  return (
    <g transform={`translate(${s.x} ${s.y}) scale(${dir} 1)`} opacity={s.hypothetical ? 0.95 : 1}>
      <path
        d={`M ${-s.len / 2} 0 L ${-s.len / 2 + tail} ${-h * 0.55} L ${-s.len / 2 + tail * 0.8} 0 L ${-s.len / 2 + tail} ${h * 0.55} Z`}
        fill={s.color}
        opacity={0.8}
      />
      <ellipse cx={-s.len / 2 + tail * 0.7 + body / 2} cy={0} rx={body / 2} ry={h / 2} fill={s.color} />
      <circle cx={s.len / 2 - body * 0.14} cy={-h * 0.08} r={Math.max(1.6, s.len * 0.035)} fill="#fff" />
      {s.hypothetical && (
        <ellipse
          cx={-s.len / 2 + tail * 0.7 + body / 2}
          cy={0}
          rx={body / 2 + 2}
          ry={h / 2 + 2}
          fill="none"
          stroke="#fff"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      )}
    </g>
  );
}

function Shrimp({ s }: { s: Sprite }) {
  const dir = s.flip ? -1 : 1;
  const L = s.len;
  return (
    <g transform={`translate(${s.x} ${s.y}) scale(${dir} 1)`}>
      <path
        d={`M ${-L / 2} ${L * 0.05} Q ${-L * 0.1} ${-L * 0.45} ${L / 2} ${-L * 0.05} Q ${-L * 0.1} ${-L * 0.1} ${-L / 2} ${L * 0.05} Z`}
        fill={s.color}
      />
      <circle cx={L * 0.36} cy={-L * 0.12} r={Math.max(1.2, L * 0.04)} fill="#fff" />
    </g>
  );
}

function Snail({ s }: { s: Sprite }) {
  const dir = s.flip ? -1 : 1;
  const L = s.len;
  return (
    <g transform={`translate(${s.x} ${s.y}) scale(${dir} 1)`}>
      <ellipse cx={0} cy={L * 0.15} rx={L * 0.5} ry={L * 0.12} fill="#8a9d95" />
      <circle cx={-L * 0.05} cy={-L * 0.05} r={L * 0.36} fill={s.color} />
      <circle cx={-L * 0.05} cy={-L * 0.05} r={L * 0.18} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} />
    </g>
  );
}

export function TankSimulationView({
  lines,
  lengthCm,
  heightCm,
  level,
  ratio,
}: {
  lines: DensityLine[];
  lengthCm: number;
  heightCm: number;
  level: DensityLevelId;
  ratio: number;
}) {
  const [legend, setLegend] = useState(false);
  const W = lengthCm * 10;
  const H = heightCm * 10;
  const substrate = Math.min(60, H * 0.1);

  // Clé de recalcul : le dessin ne bouge que si la population ou les dimensions changent.
  const signature = lines.map((l) => `${l.id}:${l.quantity}:${l.sizeCm}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sprites = useMemo(() => layout(lines, W, H, substrate), [signature, W, H, substrate]);

  const w = WATER[level];
  const drawn = sprites.length;
  const total = lines.reduce((n, l) => n + Math.max(0, Math.round(l.quantity)), 0);
  const capped = lines.some((l) => l.quantity > MAX_DRAWN_PER_LINE);
  const legendLines = lines.filter((l) => l.quantity > 0 && l.sizeCm > 0);

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h4 className="text-lg text-slate-900">Le bac vu de face, à l’échelle</h4>
        <button type="button" onClick={() => setLegend((v) => !v)} className="text-xs font-medium text-teal-700 hover:underline">
          {legend ? 'Masquer la légende' : 'Voir la légende'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border-4 border-slate-800 bg-slate-800 shadow-inner">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Vue du bac avec ${total} animaux, densité ${ratio.toFixed(2)} cm par litre`}>
          <defs>
            <linearGradient id="sim-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={w.top} />
              <stop offset="1" stopColor={w.bottom} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#sim-water)" />

          {/* plantes décoratives, derrière les animaux */}
          {[0.08, 0.2, 0.88, 0.95].map((px, i) => (
            <path
              key={i}
              d={`M ${W * px} ${H - substrate} q ${i % 2 ? 22 : -22} ${-H * 0.25} 0 ${-H * 0.5}`}
              stroke="#2f6f47"
              strokeOpacity={0.55}
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {sprites.map((s) => (s.type === 'fish' ? <Fish key={s.key} s={s} /> : s.type === 'snail' ? <Snail key={s.key} s={s} /> : <Shrimp key={s.key} s={s} />))}

          <rect y={H - substrate} width={W} height={substrate} fill="#d8c79a" />
          <rect y={H - substrate} width={W} height={5} fill="#c4b283" />
        </svg>
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        Chaque animal est dessiné à sa taille adulte sur un bac de {lengthCm} cm de long. Les contours pointillés sont les espèces simulées.
        {capped && ` Pour rester lisible, seuls ${drawn} animaux sur ${total} sont dessinés.`}
      </p>

      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {legendLines.map((l) => (
            <li key={l.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[lines.indexOf(l) % PALETTE.length] }} />
              {l.quantity} {l.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
