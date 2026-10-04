'use client';

import { scientificNameOf } from '@/lib/species-catalog';
import type { Livestock, SwimZone, Tank } from '@/types/database';
import { AlertTriangle, Info } from 'lucide-react';

const SWIM_ZONE_LABELS: Record<SwimZone, string> = {
  top: 'Haut',
  mid: 'Milieu',
  bottom: 'Fond',
};

// Repère indicatif largement utilisé : ~1 cm de poisson adulte par litre
// d'eau pour un bac communautaire classique. Volontairement prudent — ne
// remplace pas le calculateur de charge biologique (facteur bioload), qui
// reste la référence pour le score de santé.
const CM_PER_LITER_REFERENCE = 1;

function levelFromRatio(ratio: number): { label: string; color: string } {
  if (ratio < 0.5) return { label: 'Sous-peuplé', color: 'bg-sky-100 text-sky-700' };
  if (ratio <= 1) return { label: 'Bien peuplé', color: 'bg-emerald-100 text-emerald-700' };
  if (ratio <= 1.4) return { label: 'Densément peuplé', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Surpeuplé', color: 'bg-red-100 text-red-700' };
}

export function PopulationOverview({ tank, livestock }: { tank: Tank; livestock: Livestock[] }) {
  const animals = livestock.filter((l) => l.category !== 'plant');

  const totalCm = animals.reduce((sum, l) => sum + (l.adult_size_cm ?? 0) * l.quantity, 0);
  const ratio = tank.volume_liters > 0 ? totalCm / tank.volume_liters : 0;
  const pct = Math.min(150, Math.round((ratio / CM_PER_LITER_REFERENCE) * 100));
  const level = levelFromRatio(ratio);

  const zoneCounts: Record<SwimZone, number> = { top: 0, mid: 0, bottom: 0 };
  animals.forEach((l) => {
    zoneCounts[l.swim_zone] += l.quantity;
  });
  const totalIndividuals = animals.reduce((s, l) => s + l.quantity, 0);
  const maxZone = Math.max(1, ...Object.values(zoneCounts));

  const bySpecies = [...animals]
    .filter((l) => l.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);
  const maxSpecies = Math.max(1, ...bySpecies.map((l) => l.quantity));

  const behaviorWarnings = animals.filter((l) => l.solitary && l.quantity > 1);
  const missingSizeData = livestock.filter((l) => l.category !== 'plant' && !l.adult_size_cm);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Niveau de peuplement</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${level.color}`}>{level.label}</span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-bold text-slate-900">{pct}%</span>
          <span className="mb-1 text-sm text-slate-400">
            · {ratio.toFixed(2)} cm de poisson / L (repère indicatif ~1 cm/L)
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${pct > 140 ? 'bg-red-500' : pct > 100 ? 'bg-amber-500' : 'bg-teal-500'}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Estimation indicative basée sur la taille adulte des espèces déclarées — le score de
          santé et le calculateur de peuplement restent la référence pour la charge biologique
          réelle.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Zones de nage</h3>
        {totalIndividuals === 0 ? (
          <p className="text-sm text-slate-400">Aucun animal enregistré pour l&apos;instant</p>
        ) : (
          <div className="space-y-2">
            {(Object.keys(SWIM_ZONE_LABELS) as SwimZone[]).map((z) => (
              <div key={z} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm text-slate-600">{SWIM_ZONE_LABELS[z]}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: `${(zoneCounts[z] / maxZone) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm text-slate-500">{zoneCounts[z]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Répartition par espèce</h3>
        {bySpecies.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune espèce enregistrée pour l&apos;instant</p>
        ) : (
          <div className="space-y-2">
            {bySpecies.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm leading-tight text-slate-600">
                  <span className="block truncate">{l.species_common_name}</span>
                  {scientificNameOf(l.species_common_name, l.species_scientific_name) && (
                    <span className="block truncate text-xs italic text-slate-400">
                      {scientificNameOf(l.species_common_name, l.species_scientific_name)}
                    </span>
                  )}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${(l.quantity / maxSpecies) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm text-slate-500">{l.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Comportement</h3>
        {behaviorWarnings.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun conflit de comportement détecté</p>
        ) : (
          <ul className="space-y-2">
            {behaviorWarnings.map((l) => (
              <li key={l.id} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {l.species_common_name} est une espèce solitaire, mais {l.quantity} individus sont
                  enregistrés — un risque de combats jusqu&apos;à la mort entre eux est possible. Séparer
                  ou retirer les individus en surnombre.
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Qualité des données</h3>
        {missingSizeData.length === 0 ? (
          <p className="text-sm text-slate-400">Toutes les données nécessaires à l&apos;estimation sont renseignées</p>
        ) : (
          <ul className="space-y-2">
            {missingSizeData.map((l) => (
              <li key={l.id} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  Taille adulte inconnue pour {l.species_common_name} — l&apos;estimation du niveau de
                  peuplement peut être sous-évaluée. Renseigne-la via une correspondance du catalogue
                  ou en modifiant la fiche.
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
