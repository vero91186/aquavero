'use client';

import { useState } from 'react';
import { SHRIMP_COLORS, STATUS_INFO, crossOf, swatchBackground } from '@/lib/neocaridina-crosses';

// Tableau de croisement des couleurs de Neocaridina : un simulateur à deux
// parents, puis le tableau complet (triangle, le croisement est symétrique).
export function CrossingChart() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(2);

  const result = crossOf(a, b);
  const info = STATUS_INFO[result.status];

  const chips = (selected: number, onPick: (i: number) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {SHRIMP_COLORS.map((c, i) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={selected === i}
          onClick={() => onPick(i)}
          className={`flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm transition ${
            selected === i
              ? 'border-teal-600 bg-teal-600 font-semibold text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'
          }`}
        >
          <span className="h-4 w-4 rounded-full ring-1 ring-black/25" style={{ background: c.hex }} />
          {c.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-xl text-abysse">Croisements de couleurs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Toutes les couleurs de Neocaridina davidi se croisent et donnent des descendants fertiles. Les résultats sont les plus
            probables, ils varient selon les lignées.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Parent A</p>
          {chips(a, setA)}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Parent B</p>
          {chips(b, setB)}
        </div>

        <div aria-live="polite" className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3">
          <div className="h-[76px] w-[110px] shrink-0 rounded-lg ring-1 ring-black/20" style={{ background: swatchBackground(result.swatch) }} />
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-lg font-semibold text-abysse">{result.label}</p>
            <p className="text-sm font-medium text-slate-500">
              {info.glyph} {SHRIMP_COLORS[a].name} × {SHRIMP_COLORS[b].name} · {info.title}
            </p>
            <p className="mt-1 text-sm text-slate-700">{info.tip}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg text-abysse">Tableau complet</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b border-r border-slate-200 bg-white p-2" />
                {SHRIMP_COLORS.map((c) => (
                  <th key={c.key} scope="col" className="min-w-[104px] border-b border-r border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 last:border-r-0">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/25" style={{ background: c.hex }} />
                      {c.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHRIMP_COLORS.map((row, i) => (
                <tr key={row.key}>
                  <th scope="row" className="sticky left-0 z-10 min-w-[112px] border-b border-r border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/25" style={{ background: row.hex }} />
                      {row.name}
                    </span>
                  </th>
                  {SHRIMP_COLORS.map((col, j) => {
                    if (j < i) return <td key={col.key} className="border-b border-r border-slate-200 bg-slate-100/70 last:border-r-0" />;
                    const r = crossOf(i, j);
                    return (
                      <td key={col.key} className="border-b border-r border-slate-200 p-2 align-top last:border-r-0">
                        <div className="h-[30px] rounded-md ring-1 ring-black/20" style={{ background: swatchBackground(r.swatch) }} />
                        <p className="mt-1 text-[11.5px] leading-snug text-slate-700">
                          <span className="text-[11px] text-teal-600">{STATUS_INFO[r.status].glyph}</span> {r.label}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          {(['pur', 'stable', 'variable', 'sauvage'] as const).map((s) => (
            <li key={s}>
              <span className="mr-1 font-semibold text-teal-600">{STATUS_INFO[s].glyph}</span>
              {STATUS_INFO[s].title}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h3 className="text-lg text-abysse">À retenir</h3>
        <p>Les croisements entre couleurs éloignées (bleu × rouge, bleu × jaune) donnent souvent des teintes ternes, avec un retour au sauvage dès la 2ᵉ ou 3ᵉ génération.</p>
        <p>Pour garder des couleurs pures, une seule couleur par bac, ou des teintes voisines (rouge, orange, jaune).</p>
        <p>Gardez les individus les plus colorés pour la reproduction et retirez les sauvages.</p>
      </section>
    </div>
  );
}
