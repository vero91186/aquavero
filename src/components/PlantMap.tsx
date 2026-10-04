'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock, Tank } from '@/types/database';
import { scientificNameOf } from '@/lib/species-catalog';
import { MapPin, Trash2, Wand2, Eraser } from 'lucide-react';

type Pt = { x: number; y: number };

// Couleurs franchement distinctes (et lisibles sur le sable) : une par espèce.
const PALETTE = ['#0f7a4f', '#d9480f', '#6741d9', '#c2255c', '#1c7ed6', '#8c5a2b', '#0b7285', '#9c36b5', '#5c940d', '#c92a2a'];

type Shape = 'tuft' | 'rosette' | 'leaf' | 'moss' | 'fern' | 'floating' | 'stem';
const SHAPES: { re: RegExp; shape: Shape; label: string }[] = [
  { re: /flottant|lentille|salvinia|pistia|limnobium|laitue/i, shape: 'floating', label: 'flottante' },
  { re: /vallis|sagittaria|jonc|herbe|gazon|eleocharis|hairgrass|ruban|cyperus/i, shape: 'tuft', label: 'herbe en ruban' },
  { re: /crypto|echinodorus|épée|epee|sword|lilaea/i, shape: 'rosette', label: 'rosette' },
  { re: /anubias|nymph|lotus|bucephalandra|spathiphyllum|aponogeton/i, shape: 'leaf', label: 'larges feuilles' },
  { re: /mousse|moss|riccia|fissidens|monosolenium|pelia|christmas/i, shape: 'moss', label: 'mousse' },
  { re: /foug[eè]re|fern|microsorum|bolbitis|ceratopteris/i, shape: 'fern', label: 'fougère' },
];
const shapeOf = (name: string) => SHAPES.find((x) => x.re.test(name)) ?? { shape: 'stem' as Shape, label: 'plante à tiges' };

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

// Rayon d'emprise : largeur de la fiche précise si elle existe, sinon estimé d'après la hauteur.
function radiusOf(p: Livestock) {
  const w = p.plant_info?.width_cm;
  if (w) return Math.min(12, Math.max(2.5, w / 2));
  const h = p.adult_size_cm ?? 15;
  return Math.min(7, Math.max(4, 3.5 + h * 0.08));
}

function Glyph({ shape, r, color }: { shape: Shape; r: number; color: string }) {
  const sw = Math.max(3, r * 0.14);
  switch (shape) {
    case 'tuft':
      return (
        <g stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none">
          {[-0.9, -0.45, 0, 0.45, 0.9].map((a, i) => (
            <path key={i} d={`M ${a * r * 0.45} ${r * 0.8} Q ${a * r * 0.9} ${-r * 0.1} ${a * r * 1.1} ${-r * 0.95}`} />
          ))}
        </g>
      );
    case 'rosette':
      return (
        <g fill={color} fillOpacity={0.85}>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx={0} cy={-r * 0.5} rx={r * 0.24} ry={r * 0.52} transform={`rotate(${i * 45})`} />
          ))}
          <circle r={r * 0.2} fill="#fff" fillOpacity={0.9} />
        </g>
      );
    case 'leaf':
      return (
        <g fill={color} fillOpacity={0.9}>
          <ellipse cx={-r * 0.38} cy={-r * 0.1} rx={r * 0.4} ry={r * 0.62} transform={`rotate(-28 ${-r * 0.38} ${-r * 0.1})`} />
          <ellipse cx={r * 0.38} cy={-r * 0.1} rx={r * 0.4} ry={r * 0.62} transform={`rotate(28 ${r * 0.38} ${-r * 0.1})`} />
          <ellipse cx={0} cy={r * 0.12} rx={r * 0.42} ry={r * 0.66} />
        </g>
      );
    case 'moss':
      return (
        <g>
          <circle r={r * 0.85} fill={color} fillOpacity={0.45} stroke={color} strokeWidth={sw} strokeDasharray={`${sw * 0.8} ${sw * 1.4}`} strokeLinecap="round" />
          <circle r={r * 0.45} fill={color} fillOpacity={0.7} />
        </g>
      );
    case 'fern':
      return (
        <g stroke={color} strokeWidth={sw * 0.7} strokeLinecap="round" fill="none">
          <path d={`M 0 ${r * 0.9} L 0 ${-r * 0.9}`} />
          {[-0.6, -0.25, 0.1, 0.45, 0.78].map((y, i) => (
            <path key={i} d={`M 0 ${y * r} L ${-r * 0.55 * (1 - Math.abs(y) * 0.3)} ${y * r - r * 0.28} M 0 ${y * r} L ${r * 0.55 * (1 - Math.abs(y) * 0.3)} ${y * r - r * 0.28}`} />
          ))}
        </g>
      );
    case 'floating':
      return (
        <g fill={color} fillOpacity={0.55} stroke={color} strokeWidth={sw * 0.6}>
          <circle cx={-r * 0.35} cy={-r * 0.2} r={r * 0.38} />
          <circle cx={r * 0.38} cy={-r * 0.1} r={r * 0.38} />
          <circle cx={0} cy={r * 0.38} r={r * 0.38} />
        </g>
      );
    default:
      return (
        <g stroke={color} strokeWidth={sw * 0.7} strokeLinecap="round" fill={color} fillOpacity={0.85}>
          <path d={`M 0 ${r * 0.9} L 0 ${-r * 0.7}`} fill="none" />
          {[-0.5, -0.1, 0.3].map((y, i) => (
            <g key={i}>
              <ellipse cx={-r * 0.38} cy={y * r} rx={r * 0.3} ry={r * 0.14} />
              <ellipse cx={r * 0.38} cy={y * r - r * 0.12} rx={r * 0.3} ry={r * 0.14} />
            </g>
          ))}
        </g>
      );
  }
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
  const colorOf = (i: number) => PALETTE[i % PALETTE.length];

  async function save(id: string, pts: Pt[], skipLocal = false) {
    if (!skipLocal) setLocal((m) => ({ ...m, [id]: pts }));
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
    const updates: { id: string; pts: Pt[] }[] = [];
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
      updates.push({ id: p.id, pts });
    }
    // Affichage immédiat, enregistrement ensuite en parallèle.
    setLocal((m) => ({ ...m, ...Object.fromEntries(updates.map((u) => [u.id, u.pts])) }));
    await Promise.all(updates.map((u) => save(u.id, u.pts, true)));
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
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: colorOf(i) }}
              >
                {i + 1}
              </span>
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
              const color = colorOf(i);
              const { shape } = shapeOf(p.species_common_name);
              const badge = Math.max(11, r * 0.34);
              return (
                <g key={`${p.id}-${idx}`} onPointerDown={(e) => onMarkerDown(e, p.id, idx)} className="cursor-grab">
                  <title>{p.species_common_name}</title>
                  <circle cx={cx} cy={cy} r={r} fill="#fffdf5" fillOpacity={0.78} stroke={sel ? '#16211d' : color} strokeWidth={sel ? 5 : 3} />
                  <g transform={`translate(${cx} ${cy})`} pointerEvents="none">
                    <Glyph shape={shape} r={r * 0.82} color={color} />
                  </g>
                  <g transform={`translate(${cx + r * 0.72} ${cy - r * 0.72})`} pointerEvents="none">
                    <circle r={badge} fill={color} stroke="#fff" strokeWidth={2.5} />
                    <text y={badge * 0.36} textAnchor="middle" fontSize={badge * 1.1} fill="#fff" fontWeight={700}>
                      {i + 1}
                    </text>
                  </g>
                  {sel && (
                    <text x={cx} y={cy + r + 22} textAnchor="middle" fontSize={22} fontWeight={700} fill="#16211d" stroke="#fffdf5" strokeWidth={5} paintOrder="stroke" pointerEvents="none">
                      {p.species_common_name}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>

      <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-xs text-slate-600 sm:grid-cols-2">
        {plants.map((p, i) => {
          const sh = shapeOf(p.species_common_name);
          return (
            <li key={p.id} className="flex items-center gap-2">
              <svg viewBox="-14 -14 28 28" className="h-6 w-6 shrink-0 rounded-full bg-[#fffdf5] ring-2" style={{ ['--tw-ring-color' as string]: colorOf(i) }}>
                <Glyph shape={sh.shape} r={11} color={colorOf(i)} />
              </svg>
              <span>
                <span className="font-semibold text-slate-800">
                  {i + 1}. {p.species_common_name}
                </span>
                {scientificNameOf(p.species_common_name, p.species_scientific_name) && (
                  <em className="text-slate-500"> {scientificNameOf(p.species_common_name, p.species_scientific_name)}</em>
                )}
                <span className="text-slate-400">, {sh.label}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {selPlant && selPt && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 text-slate-700">
            <MapPin size={15} className="text-teal-600" />
            {selPlant.species_common_name}
            {scientificNameOf(selPlant.species_common_name, selPlant.species_scientific_name) && (
              <em className="text-slate-500"> ({scientificNameOf(selPlant.species_common_name, selPlant.species_scientific_name)})</em>
            )}{' '}
            n°{(selected?.idx ?? 0) + 1}, à {Math.round(selPt.x)} cm du bord gauche et{' '}
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
