'use client';

import { useState } from 'react';
import type { Livestock, Tank } from '@/types/database';
import { computeBioload, computeStockingHeadroom } from '@/lib/health-score';
import { searchSpecies, type SpeciesReference } from '@/lib/species-catalog';
import { Calculator } from 'lucide-react';

const LEVEL_STYLES: Record<string, string> = {
  faible: 'bg-emerald-100 text-emerald-700',
  modérée: 'bg-teal-100 text-teal-700',
  élevée: 'bg-amber-100 text-amber-700',
  critique: 'bg-red-100 text-red-700',
};

export function StockingCalculator({ tank, livestock }: { tank: Tank; livestock: Livestock[] }) {
  const [name, setName] = useState('');
  const [suggestions, setSuggestions] = useState<SpeciesReference[]>([]);
  const [matched, setMatched] = useState<SpeciesReference | null>(null);
  const [manualFactor, setManualFactor] = useState('1');
  const [quantity, setQuantity] = useState('1');

  const bioloadFactorPerUnit = matched ? matched.bioloadFactor : parseFloat(manualFactor) || 0;
  const qty = parseInt(quantity, 10) || 0;

  const current = computeBioload(tank, livestock);
  const projected = computeBioload(tank, [
    ...livestock,
    ...(qty > 0
      ? [{ bioload_factor: bioloadFactorPerUnit, quantity: qty } as Livestock]
      : []),
  ]);
  const headroom = computeStockingHeadroom(tank, livestock, bioloadFactorPerUnit);

  function handleNameChange(value: string) {
    setName(value);
    setMatched(null);
    setSuggestions(searchSpecies(value));
  }

  function applySuggestion(s: SpeciesReference) {
    setName(s.commonName);
    setManualFactor(String(s.bioloadFactor));
    setMatched(s);
    setSuggestions([]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Calculator size={18} className="text-teal-600" />
        <h3 className="font-semibold text-slate-900">Calculateur de peuplement</h3>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Simule l&apos;ajout d&apos;une espèce pour voir l&apos;impact sur la charge biologique de ce
        bac, avant de l&apos;acheter.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <input
            placeholder="Espèce envisagée (ex. Corydoras sterbai)"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <li key={s.scientificName}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-teal-50"
                  >
                    <span className="font-medium text-slate-800">{s.commonName}</span>
                    <span className="text-xs italic text-slate-400">{s.scientificName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          type="number"
          min="1"
          placeholder="Quantité envisagée"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      {!matched && name.length > 0 && (
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Espèce hors catalogue : facteur bioload estimé (1 = petit poisson paisible type néon)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={manualFactor}
            onChange={(e) => setManualFactor(e.target.value)}
            className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      )}
      {matched && (
        <p className="mt-2 text-xs text-teal-600">
          Facteur bioload catalogue : {matched.bioloadFactor} · taille adulte ~{matched.adultSizeCm} cm
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Charge actuelle</p>
          <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[current.loadLevel]}`}>
            {current.loadLevel}
          </p>
          <p className="mt-1 text-xs text-slate-500">{current.bioloadPerLiter.toFixed(3)} unité/L</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-400">Après ajout de {qty || 0}</p>
          <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[projected.loadLevel]}`}>
            {projected.loadLevel}
          </p>
          <p className="mt-1 text-xs text-slate-500">{projected.bioloadPerLiter.toFixed(3)} unité/L</p>
        </div>
      </div>

      {bioloadFactorPerUnit > 0 ? (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            projected.loadLevel === 'critique'
              ? 'bg-red-50 text-red-700'
              : projected.loadLevel === 'élevée'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          Avec ce facteur bioload, tu peux encore ajouter environ{' '}
          <strong>{headroom.maxBeforeElevee ?? 0}</strong> individu(s) avant de passer en charge
          élevée, et <strong>{headroom.maxBeforeCritique ?? 0}</strong> avant le seuil critique
          (à volume constant, sans autre ajout).
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Renseigne une espèce ou un facteur bioload pour voir la marge disponible.
        </p>
      )}
    </div>
  );
}
