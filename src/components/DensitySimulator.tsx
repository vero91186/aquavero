'use client';

import { useMemo, useState } from 'react';
import type { Livestock } from '@/types/database';
import { searchSpecies, type SpeciesReference } from '@/lib/species-catalog';
import {
  DENSITY_LIMIT,
  DENSITY_SCALE_MAX,
  INVERTEBRATE_COEF,
  computeDensity,
  densityLevel,
  linesFromLivestock,
  type DensityLine,
  type DensityLevelId,
} from '@/lib/density';
import { createClient } from '@/lib/supabase/client';
import { TankSimulationView } from '@/components/TankSimulationView';
import { Gauge, Minus, Plus, RotateCcw, Save, TriangleAlert, X } from 'lucide-react';

const LEVEL_STYLES: Record<DensityLevelId, { tile: string; box: string }> = {
  aere: { tile: 'bg-emerald-100 text-emerald-700', box: 'bg-emerald-50 text-emerald-700' },
  raisonnable: { tile: 'bg-teal-100 text-teal-700', box: 'bg-teal-50 text-teal-700' },
  charge: { tile: 'bg-amber-100 text-amber-700', box: 'bg-amber-50 text-amber-700' },
  surcharge: { tile: 'bg-red-100 text-red-700', box: 'bg-red-50 text-red-700' },
};

function fmt(n: number, digits = 0) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Simulateur de densité (cm de poisson par litre) pour un bac. Il part du
// peuplement réellement enregistré et du volume saisi dans les propriétés,
// mais tout ce qu'on y change (quantités, espèces ajoutées) reste hypothétique :
// rien n'est écrit en base.
export function DensitySimulator({
  tankId,
  livestock,
  netLiters: savedNet,
  grossLiters: savedGross,
  lengthCm,
  heightCm,
  onUpdated,
}: {
  tankId: string;
  livestock: Livestock[];
  netLiters: number;
  grossLiters: number | null;
  onUpdated?: () => void;
  lengthCm?: number | null;
  heightCm?: number | null;
}) {
  const supabase = createClient();
  // Les volumes se corrigent ici sans quitter l'écran ; ils ne sont écrits en
  // base que sur demande (bouton « Enregistrer les volumes »).
  const [draftNet, setDraftNet] = useState<string | null>(null);
  const [draftGross, setDraftGross] = useState<string | null>(null);
  const [savingVol, setSavingVol] = useState(false);
  const [volError, setVolError] = useState<string | null>(null);
  const netInput = draftNet ?? (savedNet > 0 ? String(savedNet) : '');
  const grossInput = draftGross ?? (savedGross ? String(savedGross) : '');
  const netLiters = parseFloat(netInput) || 0;
  const grossLiters = parseFloat(grossInput) || null;
  const volDirty = draftNet !== null || draftGross !== null;
  const netEqualsGross = grossLiters !== null && netLiters >= grossLiters;

  async function saveVolumes() {
    setSavingVol(true);
    setVolError(null);
    const { error } = await supabase
      .from('tanks')
      .update({ volume_liters: netLiters, gross_volume_liters: grossLiters })
      .eq('id', tankId);
    setSavingVol(false);
    if (error) {
      setVolError(`Enregistrement impossible : ${error.message}`);
      return;
    }
    setDraftNet(null);
    setDraftGross(null);
    onUpdated?.();
  }

  const base = useMemo(() => linesFromLivestock(livestock), [livestock]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<DensityLine[]>([]);
  const [flow, setFlow] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SpeciesReference[]>([]);

  const lines: DensityLine[] = [
    ...base.map((l) => ({ ...l, quantity: overrides[l.id] ?? l.quantity })),
    ...extras,
  ];
  const result = computeDensity(
    lines,
    netLiters,
    grossLiters,
    parseFloat(flow) || null
  );
  const level = densityLevel(result.ratioNet);
  const styles = LEVEL_STYLES[level.id];
  const markerPct = Math.min(result.ratioNet / DENSITY_SCALE_MAX, 1) * 100;
  const missingSizes = base.filter((l) => l.sizeCm <= 0 && (overrides[l.id] ?? l.quantity) > 0);
  const modified = Object.keys(overrides).length > 0 || extras.length > 0;

  function setQty(id: string, quantity: number) {
    setOverrides((o) => ({ ...o, [id]: Math.max(0, quantity) }));
  }

  function setExtraQty(id: string, quantity: number) {
    setExtras((list) => list.map((l) => (l.id === id ? { ...l, quantity: Math.max(0, quantity) } : l)));
  }

  function addExtra(s: SpeciesReference) {
    if (s.category !== 'fish' && s.category !== 'invertebrate') return;
    setExtras((list) => [
      ...list,
      {
        id: `extra-${Date.now()}-${list.length}`,
        name: s.commonName,
        sizeCm: s.adultSizeCm,
        quantity: 1,
        kind: s.category as 'fish' | 'invertebrate',
        hypothetical: true,
        zone: s.swimZone,
      },
    ]);
    setQuery('');
    setSuggestions([]);
  }

  function reset() {
    setOverrides({});
    setExtras([]);
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5"
      onKeyDown={(e) => {
        // Ce bloc est dans le formulaire des propriétés : Entrée ne doit pas l'envoyer.
        if (e.key === 'Enter') e.preventDefault();
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <Gauge size={18} className="text-teal-600" />
        <h3 className="font-semibold text-slate-900">Simulateur de densité</h3>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Centimètres de poisson par litre d&apos;eau, calculés sur les volumes ci-dessous et sur le
        peuplement. Change les quantités ou ajoute une espèce pour voir l&apos;effet : rien n&apos;est
        enregistré. Un invertébré compte pour {Math.round(INVERTEBRATE_COEF * 100)} % d&apos;un poisson de même
        longueur.
      </p>

      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Volume brut, aquarium vide (L)</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={grossInput}
              onChange={(e) => setDraftGross(e.target.value)}
              placeholder="ex. 180"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">Volume réel, avec sol et décor (L)</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={netInput}
              onChange={(e) => setDraftNet(e.target.value)}
              placeholder="ex. 150"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        {netEqualsGross && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            Le volume réel est égal au volume brut : le calcul sous-estime la densité. Le sol, le décor et le niveau
            d&apos;eau retirent environ 15 à 20 %, soit près de 150 L pour un bac de 180 L brut.
          </p>
        )}
        {volDirty && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveVolumes}
              disabled={savingVol || netLiters <= 0}
              className="flex items-center gap-1.5 rounded-full bg-teal-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              <Save size={13} /> {savingVol ? 'Enregistrement…' : 'Enregistrer les volumes dans le bac'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftNet(null);
                setDraftGross(null);
              }}
              className="text-xs text-slate-500 hover:underline"
            >
              Annuler
            </button>
          </div>
        )}
        {volError && <p className="mt-2 text-xs text-red-600">{volError}</p>}
      </div>

      {netLiters <= 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Renseigne le volume réel du bac pour lancer la simulation.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            {lines.length === 0 && (
              <p className="text-sm text-slate-400">Aucun poisson ni invertébré au peuplement pour l&apos;instant.</p>
            )}
            {lines.map((l) => {
              const isExtra = !!l.hypothetical;
              return (
                <div key={l.id} className="flex items-center gap-2 border-b border-slate-100 py-1.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">
                      {l.name}
                      {isExtra && (
                        <span className="ml-1.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                          hypothèse
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {l.kind === 'fish' ? 'poisson' : 'invertébré'} ·{' '}
                      {l.sizeCm > 0 ? `${fmt(l.sizeCm, 1)} cm adulte` : 'taille adulte manquante'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Retirer un ${l.name}`}
                      onClick={() => (isExtra ? setExtraQty(l.id, l.quantity - 1) : setQty(l.id, l.quantity - 1))}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium tabular-nums">{l.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Ajouter un ${l.name}`}
                      onClick={() => (isExtra ? setExtraQty(l.id, l.quantity + 1) : setQty(l.id, l.quantity + 1))}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                    >
                      <Plus size={14} />
                    </button>
                    {isExtra && (
                      <button
                        type="button"
                        aria-label={`Retirer ${l.name} de la simulation`}
                        onClick={() => setExtras((list) => list.filter((x) => x.id !== l.id))}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {missingSizes.length > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Taille adulte manquante pour {missingSizes.map((l) => l.name).join(', ')} : ces animaux ne
              pèsent pas dans le calcul. Renseigne-la dans leur fiche du peuplement.
            </p>
          )}

          <div className="relative mt-3">
            <input
              placeholder="Simuler une espèce de plus (ex. Rasbora harlequin)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestions(
                  searchSpecies(e.target.value).filter((s) => s.category === 'fish' || s.category === 'invertebrate')
                );
              }}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.scientificName}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addExtra(s)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-teal-50"
                    >
                      <span className="font-medium text-slate-800">{s.commonName}</span>
                      <span className="text-xs text-slate-400">
                        {s.adultSizeCm} cm adulte · {s.category === 'fish' ? 'poisson' : 'invertébré'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <TankSimulationView
            lines={lines}
            lengthCm={lengthCm || 100}
            heightCm={heightCm || 50}
            level={level.id}
            ratio={result.ratioNet}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-400">cm / L d&apos;eau réelle</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{fmt(result.ratioNet, 2)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles.tile}`}>
                {level.label}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-400">cm / L brut</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {result.ratioGross !== null ? fmt(result.ratioGross, 2) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {grossLiters ? `sur ${fmt(grossLiters, 0)} L` : 'volume brut (aquarium vide) non renseigné'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-400">Litres par animal</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {result.litersPerAnimal !== null ? fmt(result.litersPerAnimal, 1) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{result.animalCount} animaux</p>
            </div>
          </div>

          <div className="mt-4">
            <div
              className="relative h-3 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg,#10b981 0 40%,#14b8a6 40% 60%,#f59e0b 60% 80%,#ef4444 80% 100%)',
              }}
              role="img"
              aria-label={`Densité ${fmt(result.ratioNet, 2)} cm par litre, niveau ${level.label}`}
            >
              <span
                className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded bg-slate-900 transition-[left]"
                style={{ left: `${markerPct}%` }}
              />
            </div>
            <div className="relative mt-1 h-4 text-[11px] text-slate-400">
              {[1, DENSITY_LIMIT, 2].map((t) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(t / DENSITY_SCALE_MAX) * 100}%` }}>
                  {fmt(t, t % 1 ? 1 : 0)}
                </span>
              ))}
            </div>
          </div>

          <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${styles.box}`}>
            {level.message}
            {result.turnover !== null && result.turnover < 3 && (
              <> Brassage du filtre juste ({fmt(result.turnover, 1)} × le volume par heure) : vise au moins 3 ×.</>
            )}
          </div>

          <dl className="mt-3 divide-y divide-slate-100 text-sm">
            {[
              ['Poissons seuls', `${fmt(result.fishCm)} cm · ${fmt(result.fishCm / netLiters, 2)} cm/L`],
              ['Invertébrés (équivalent poisson)', `${fmt(result.invertebrateCm)} cm`],
              ['Charge totale', `${fmt(result.totalCm)} cm`],
              [
                result.marginCm >= 0 ? `Marge avant ${fmt(DENSITY_LIMIT, 1)} cm/L` : `Dépassement de ${fmt(DENSITY_LIMIT, 1)} cm/L`,
                `${fmt(Math.abs(result.marginCm))} cm`,
              ],
              [`Volume réel pour rester à ${fmt(DENSITY_LIMIT, 1)}`, `${fmt(result.volumeForLimit)} L`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium tabular-nums text-slate-800">{v}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-slate-500">
                Brassage du filtre {result.turnover !== null && <span className="text-slate-400">({fmt(result.turnover, 1)} × / h)</span>}
              </dt>
              <dd>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Débit (L/h)"
                  value={flow}
                  onChange={(e) => setFlow(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs"
                />
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="text-xs text-slate-400">
              Repère indicatif sur tailles adultes. Seuils : 1 aéré · {fmt(DENSITY_LIMIT, 1)} limite raisonnable en
              bac planté · 2 surcharge. Il ne remplace ni les tests ni l&apos;observation.
            </p>
            {modified && (
              <button
                type="button"
                onClick={reset}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={13} /> Revenir au peuplement réel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
