'use client';

import { scientificNameOf } from '@/lib/species-catalog';
import { computeDensity, densityLevel, linesFromLivestock, DENSITY_LIMIT } from '@/lib/density';
import type { Livestock, SwimZone, Tank } from '@/types/database';
import { AlertTriangle, Info } from 'lucide-react';

const SWIM_ZONE_LABELS: Record<SwimZone, string> = {
  top: 'Haut',
  mid: 'Milieu',
  bottom: 'Fond',
};

// Couleur du badge selon le niveau calculé par le module de densité, le même que
// celui de l'onglet Peuplement (poissons + invertébrés à 30 %).
const LEVEL_COLORS: Record<string, string> = {
  aere: 'bg-sky-100 text-sky-700',
  raisonnable: 'bg-emerald-100 text-emerald-700',
  charge: 'bg-amber-100 text-amber-700',
  surcharge: 'bg-red-100 text-red-700',
};

export function PopulationOverview({ tank, livestock }: { tank: Tank; livestock: Livestock[] }) {
  const animals = livestock.filter((l) => l.category !== 'plant');

  const density = computeDensity(linesFromLivestock(animals), tank.volume_liters, tank.gross_volume_liters ?? null, null);
  const ratio = density.ratioNet;
  const pct = Math.min(150, Math.round((ratio / DENSITY_LIMIT) * 100));
  const levelInfo = densityLevel(ratio);
  const level = { label: levelInfo.label, color: LEVEL_COLORS[levelInfo.id] ?? LEVEL_COLORS.aere };

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
            · {ratio.toFixed(2)} cm équivalent poisson / L (limite conseillée {DENSITY_LIMIT})
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${pct > 133 ? 'bg-red-500' : pct > 100 ? 'bg-amber-500' : 'bg-teal-500'}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Estimation indicative basée sur la taille adulte des espèces déclarées (crevettes et
          escargots comptés pour 30 %), calculée comme dans l’onglet Peuplement.
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
