'use client';

import { useState } from 'react';
import { Fish, Gauge } from 'lucide-react';
import type { Livestock, Tank } from '@/types/database';
import { computeDensity, densityLevel, linesFromLivestock, DENSITY_LIMIT } from '@/lib/density';

// Récapitulatif de ce qui est réellement dans le bac (date d'introduction passée)
// et de ce qui est prévu (date à venir ou à fixer), avec la même densité que le
// simulateur : les deux écrans partent du même peuplement enregistré.
export function MyFishRecap({ tank, livestock, onOpenSimulator }: {
  tank: Tank;
  livestock: Livestock[];
  onOpenSimulator: () => void;
}) {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const animals = livestock.filter((l) => l.category === 'fish' || l.category === 'invertebrate');
  const inTank = animals.filter((l) => l.added_at && l.added_at <= today);
  const planned = animals.filter((l) => !l.added_at || l.added_at > today);

  const count = (list: Livestock[]) => list.reduce((s, l) => s + l.quantity, 0);
  const density = (list: Livestock[]) =>
    computeDensity(linesFromLivestock(list), tank.volume_liters, tank.gross_volume_liters ?? null, null);

  const now = density(inTank);
  const all = density(animals);
  const level = densityLevel(all.ratioNet);
  const missingSizes = animals.filter((l) => !l.adult_size_cm).length;
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <Fish size={18} className="text-teal-600" /> Mes poissons
        </h3>
        <button
          type="button"
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs text-teal-800 hover:bg-teal-100"
        >
          <Gauge size={14} /> Simuler un changement
        </button>
      </div>
      {animals.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Aucun animal enregistré : ajoute-en ci-dessous avec leur date d&apos;introduction.</p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Dans le bac</p>
              <p className="text-lg font-semibold text-slate-900">{count(inTank)} animaux</p>
              <p className="text-xs text-slate-500">{fmt(now.ratioNet)} cm/L</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Prévus</p>
              <p className="text-lg font-semibold text-slate-900">{count(planned)} animaux</p>
              <p className="text-xs text-slate-500">date à venir ou à fixer</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Une fois tout introduit</p>
              <p className="text-lg font-semibold text-slate-900">{fmt(all.ratioNet)} cm/L</p>
              <p className="text-xs text-slate-500">{level.label} (limite conseillée {fmt(DENSITY_LIMIT)})</p>
            </div>
          </div>
          {missingSizes > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              {missingSizes} fiche{missingSizes > 1 ? 's' : ''} sans taille adulte : la densité est sous-estimée tant qu&apos;elle manque (le crayon permet de la compléter dans le simulateur).
            </p>
          )}
        </>
      )}
    </div>
  );
}
