'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock, Tank } from '@/types/database';
import { MapPin, Trash2, Wand2, Eraser } from 'lucide-react';

type Pt = { x: number; y: number };

const GREENS = ['#2f6f47', '#55996f', '#7aa63c', '#3b8056', '#8fb04a', '#1f4730', '#5f8f6b', '#a0b84e'];
const FLOATING = /flottant|lentille|salvinia|pistia|limnobium|laitue|cératophylle flott/i;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
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

// Rayon d'emprise estimé d'après la hauteur adulte (cm) : une estimation, pas une mesure.
function radiusOf(p: Livestock) {
  const h = p.adult_size_cm ?? 15;
  return Math.min(7, Math.max(4, 3.5 + h * 0.08));
}

export function PlantMap({ tank, plants, onUpdated }: { tank: Tank; plants: Livestock[]; onUpdated: () => void }) {
  const supabase = createClient();
  const svgRef = useRef<SVGSVGElement>(null);
  const L = tank.length_cm || 100;
  const D = tank.width_cm || 40;

  const [local, setLocal] = useState<Record<string, Pt[]>>({});
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; idx: number } | null>(null);
  const [drag, setDrag] = useState<{ id: string; idx: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const posOf = (p: Livestock): Pt[] => local[p.id] ?? p.positions ?? [];
  const colorOf = (i: number) => GREENS[i % GREENS.length];

  async function save(id: string, pts: Pt[]) {
    setLocal((m) => ({ ...m, [id]: pts }));
    const { error: err } = await supabase.from('livestock').update({ positions: pts }).eq('id', id);
    if (err) {
      setError("L'emplacement n'a pas pu être enregistré : lance la migration 0013_plant_positions.sql dans Supabase.");
    } else {
      setError(null);
      onUpdated();
    }
  }

  function toCm(e: React.PointerEvent): Pt | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * L;
    const y = (1 - (e.clientY - r.top) / r.height) * D;
    return { x: Math.min(L, Math.max(0, x)), y: Math.min(D, Math.max(0, y)) };
  }

  function onBackgroundDown(e: React.PointerEvent) {
    if (!placingId) {
      setSelected(null);
      return;
    }
    const plant = plants.find((p) => p.id === placingId);
    const pt = toCm(e);
    if (!plant || !pt) return;
    const pts = [...posOf(plant), pt];
    save(plant.id, pts);
    setSelected({ id: plant.id, idx: pts.length - 1 });
    if (pts.length >= plant.quantity) setPlacingId(null);
  }

  function onMarkerDown(e: React.PointerEvent, id: string, idx: number) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ id, idx });
    setSelected({ id, idx });
  }

  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const pt = toCm(e);
    const plant = plants.find((p) => p.id === drag.id);
    if (!pt || !plant) return;
    const pts = posOf(plant).map((q, i) => (i === drag.idx ? pt : q));
    setLocal((m) => ({ ...m, [plant.id]: pts }));
  }

  function onUp() {
    if (!drag) return;
    const plant = plants.find((p) => p.id === drag.id);
    if (plant) save(plant.id, posOf(plant));
    setDrag(null);
  }

  async function removeSelected() {
    if (!selected) return;
    const plant = plants.find((p) => p.id === selected.id);
    if (!plant) return;
    await save(plant.id, posOf(plant).filter((_, i) => i !== selected.idx));
    setSelected(null);
  }

  // Proposition de placement pour les plantes pas encore situées : grandes au
  // fond et sur les côtés, moyennes au milieu, petites à l'avant.
  async function autoPlace() {
    const all: { x: number; y: number; r: number }[] = [];
    plants.forEach((p) => posOf(p).forEach((q) => all.push({ ...q, r: radiusOf(p) })));
    for (const p of plants) {
      const missing = p.quantity - posOf(p).length;
      if (missing <= 0) continue;
      const rand = rng(hash(p.species_common_name));
      const h = p.adult_size_cm ?? 15;
      const r = radiusOf(p);
      const [y0, y1] = h >= 30 ? [0.65, 0.93] : h >= 12 ? [0.3, 0.68] : [0.08, 0.32];
      const pts = [...posOf(p)];
      for (let i = 0; i < missing; i++) {
        let best: Pt = { x: L / 2, y: D / 2 };
        for (let a = 0; a < 40; a++) {
          const side = rand() < 0.5;
          const x = h >= 30 ? (side ? 0.04 + rand() * 0.22 : 0.74 + rand() * 0.22) * L : (0.06 + rand() * 0.88) * L;
          const y = (y0 + rand() * (y1 - y0)) * D;
          best = { x: Math.min(L - r, Math.max(r, x)), y: Math.min(D - r, Math.max(r, y)) };
          if (all.every((o) => Math.hypot(o.x - best.x, o.y - best.y) > o.r + r)) break;
        }
        pts.push(best);
        all.push({ ...best, r });
      }
      await save(p.id, pts);
    }
  }

  async function clearAll() {
    for (const p of plants) if (posOf(p).length) await save(p.id, []);
    setSelected(null);
  }

  const selPlant = selected ? plants.find((p) => p.id === selected.id) : null;
  const selPt = selected && selPlant ? posOf(selPlant)[selected.idx] : null;
  const totalPlaced = plants.reduce((n, p) => n + Math.min(posOf(p).length, p.quantity), 0);
  const total = plants.reduce((n, p) => n + p.quantity, 0);
  const U = 10; // 1 cm = 10 unités du dessin

  if (plants.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Ajoute d’abord tes plantes ci-dessous, tu pourras ensuite les placer dans le bac.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl text-slate-900">Où sont mes plantes</h3>
        <span className="text-sm font-medium text-teal-700">
          {totalPlaced} placée{totalPlaced > 1 ? 's' : ''} sur {total}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Vue de dessus du bac ({L} × {D} cm). Choisis une plante puis touche le plan pour la poser, ou fais glisser un
        rond pour la déplacer. Les ronds donnent l’emprise estimée de chaque plante.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {plants.map((p, i) => {
          const placed = Math.min(posOf(p).length, p.quantity);
          const left = p.quantity - placed;
          const active = placingId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={left <= 0}
              onClick={() => setPlacingId(active ? null : p.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                active ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(i) }} />
              {p.species_common_name}
              <span className={active ? 'text-teal-100' : 'text-slate-400'}>
                {placed}/{p.quantity}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border-4 border-slate-800 bg-slate-800">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${L * U} ${D * U}`}
          className={`block w-full touch-none select-none ${placingId ? 'cursor-crosshair' : ''}`}
          onPointerDown={onBackgroundDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          role="img"
          aria-label="Plan de dessus du bac avec l'emplacement des plantes"
        >
          <defs>
            <pattern id="sand" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#e6d8ae" />
              <circle cx="8" cy="10" r="1.5" fill="#d3c28f" />
              <circle cx="26" cy="22" r="1.5" fill="#d3c28f" />
              <circle cx="14" cy="32" r="1.2" fill="#d3c28f" />
            </pattern>
          </defs>
          <rect width={L * U} height={D * U} fill="url(#sand)" />
          {/* grille tous les 10 cm */}
          {Array.from({ length: Math.floor(L / 10) }, (_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 10 * U} x2={(i + 1) * 10 * U} y1={0} y2={D * U} stroke="#b9a877" strokeOpacity={0.35} />
          ))}
          {Array.from({ length: Math.floor(D / 10) }, (_, i) => (
            <line key={`h${i}`} y1={(i + 1) * 10 * U} y2={(i + 1) * 10 * U} x1={0} x2={L * U} stroke="#b9a877" strokeOpacity={0.35} />
          ))}
          <text x={14} y={26} fontSize={20} fill="#7c6d43">fond du bac</text>
          <text x={14} y={D * U - 12} fontSize={20} fill="#7c6d43">vitre avant</text>

          {plants.map((p, i) =>
            posOf(p).slice(0, Math.max(p.quantity, posOf(p).length)).map((pt, idx) => {
              const r = radiusOf(p) * U;
              const cx = pt.x * U;
              const cy = (D - pt.y) * U;
              const sel = selected?.id === p.id && selected.idx === idx;
              const floating = FLOATING.test(p.species_common_name);
              return (
                <g key={`${p.id}-${idx}`} onPointerDown={(e) => onMarkerDown(e, p.id, idx)} className="cursor-grab">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={colorOf(i)}
                    fillOpacity={floating ? 0.35 : 0.75}
                    stroke={sel ? '#16211d' : colorOf(i)}
                    strokeWidth={sel ? 5 : 2}
                    strokeDasharray={floating ? '10 6' : undefined}
                  />
                  <text x={cx} y={cy + 7} textAnchor="middle" fontSize={Math.max(16, Math.min(26, r * 0.7))} fill="#fff" fontWeight={600} pointerEvents="none">
                    {p.species_common_name.slice(0, 2).toUpperCase()}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>

      {selPlant && selPt && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 text-slate-700">
            <MapPin size={15} className="text-teal-600" />
            {selPlant.species_common_name} n°{(selected?.idx ?? 0) + 1}, à {Math.round(selPt.x)} cm du bord gauche et{' '}
            {Math.round(selPt.y)} cm de la vitre avant
          </p>
          <button type="button" onClick={removeSelected} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
            <Trash2 size={14} /> Retirer du plan
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={autoPlace}
          disabled={totalPlaced >= total}
          className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          <Wand2 size={15} /> Proposer un placement
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={totalPlaced === 0}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Eraser size={15} /> Tout effacer
        </button>
      </div>
      {error && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
    </section>
  );
}
