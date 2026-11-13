'use client';

import { useState } from 'react';
import type { Tank, WaterTest } from '@/types/database';
import { analyzeWaterTest, type ParamAnalysis, type Zone } from '@/lib/water-analysis';

const COLORS: Record<Zone, string> = { good: '#10b981', warn: '#f59e0b', bad: '#ef4444' };
const ZONE_TEXT: Record<Zone, string> = { good: 'Bon', warn: 'À surveiller', bad: 'Mauvais' };

function pct(spec: { min: number; max: number }, v: number) {
  return Math.max(0, Math.min(100, ((v - spec.min) / (spec.max - spec.min)) * 100));
}

// Ligne rouge → orange → vert → orange → rouge avec un curseur sur la valeur.
function Slider({ p }: { p: ParamAnalysis }) {
  const { spec } = p;
  const gs = pct(spec, spec.good[0]);
  const ge = pct(spec, spec.good[1]);
  const ws = pct(spec, spec.warn[0]);
  const we = pct(spec, spec.warn[1]);
  const R = COLORS.bad, O = COLORS.warn, G = COLORS.good;
  // Segments : rouge | orange | vert | orange | rouge (les segments vides sont ignorés par le navigateur).
  const gradient = `linear-gradient(to right, ${R} 0%, ${R} ${ws}%, ${O} ${ws}%, ${O} ${gs}%, ${G} ${gs}%, ${G} ${ge}%, ${O} ${ge}%, ${O} ${we}%, ${R} ${we}%, ${R} 100%)`;
  const x = pct(spec, p.value);
  return (
    <div className="relative mt-3 mb-1 h-3 rounded-full" style={{ background: gradient }}>
      <div
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md"
        style={{ left: `${x}%`, background: COLORS[p.zone] }}
        aria-hidden
      />
    </div>
  );
}

export function WaterTestAnalysis({ tank, tests }: { tank: Tank; tests: WaterTest[] }) {
  const [index, setIndex] = useState(0);
  if (tests.length === 0) return null;
  const test = tests[Math.min(index, tests.length - 1)];
  const analysis = analyzeWaterTest(test, tank);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">Analyse du test</h3>
        <select
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
        >
          {tests.slice(0, 15).map((t, i) => (
            <option key={t.id} value={i}>
              {i === 0 ? 'Dernier test — ' : ''}
              {new Date(t.tested_at).toLocaleDateString('fr-FR')}
            </option>
          ))}
        </select>
      </div>

      {analysis.params.length === 0 ? (
        <p className="text-sm text-slate-400">Ce test ne contient aucune valeur à analyser.</p>
      ) : (
        <>
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: `${COLORS[analysis.verdict]}1a`, color: COLORS[analysis.verdict] }}
          >
            {analysis.verdictLabel}
          </p>
          <div className="space-y-4">
            {analysis.params.map((p) => (
              <div key={p.spec.key}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-700">{p.spec.label}</span>
                  <span className="text-sm font-semibold" style={{ color: COLORS[p.zone] }}>
                    {p.value} {p.spec.unit} · {ZONE_TEXT[p.zone]}
                  </span>
                </div>
                <Slider p={p} />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{p.spec.min}</span>
                  <span>
                    idéal {p.spec.good[0]} – {p.spec.good[1]}
                  </span>
                  <span>{p.spec.max}</span>
                </div>
                {p.advice && <p className="mt-1 text-xs text-slate-600">{p.advice}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Repères généraux pour un bac {tank.water_type === 'saltwater' ? 'd’eau de mer' : 'd’eau douce communautaire'} :
            certaines espèces (crevettes, discus, etc.) ont des besoins plus précis.
          </p>
        </>
      )}
    </div>
  );
}
