'use client';

import { useMemo, useState } from 'react';
import type { Livestock } from '@/types/database';
import { searchSpecies, SPECIES_CATALOG, schoolMinOf, schoolMinByName, type SpeciesReference } from '@/lib/species-catalog';
import {
  computeZoneDensity,
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
import { DensityProjects } from '@/components/DensityProjects';
import { TankSimulationView } from '@/components/TankSimulationView';
import { Gauge, Shuffle, Minus, Plus, RotateCcw, Save, TriangleAlert, X } from 'lucide-react';

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
  const zoneStats = computeZoneDensity(lines, netLiters);
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

  const [altFor, setAltFor] = useState<string | null>(null);

  // Espèces de remplacement : même type et même étage, taille voisine, tempérament paisible,
  // compatibles avec le volume du bac, et pas déjà présentes.
  function alternativesFor(l: DensityLine): SpeciesReference[] {
    const present = new Set(lines.map((x) => (x.scientificName ?? x.name).toLowerCase()));
    const zone = l.kind === 'invertebrate' ? 'bottom' : (l.zone ?? 'mid');
    const vol = grossLiters && grossLiters > 0 ? grossLiters : netLiters;
    return SPECIES_CATALOG.filter(
      (c) =>
        c.category === l.kind &&
        (l.kind === 'invertebrate' || c.swimZone === zone) &&
        !present.has(c.scientificName.toLowerCase()) &&
        !present.has(c.commonName.toLowerCase()) &&
        c.minTankLiters <= vol &&
        !c.solitary &&
        !/agressif|prédateur|inadapté|mange les/i.test(`${c.temperament}`)
    );
  }

  // Trois familles de taille : plus petites, voisines (±25 %), plus grandes.
  function groupedAlternatives(l: DensityLine) {
    const size = l.sizeCm > 0 ? l.sizeCm : 5;
    const all = alternativesFor(l);
    const dist = (a: SpeciesReference) => Math.abs(a.adultSizeCm - size);
    const similar = all.filter((a) => Math.abs(a.adultSizeCm - size) <= size * 0.25).sort((a, b) => dist(a) - dist(b));
    const smaller = all.filter((a) => a.adultSizeCm < size * 0.75).sort((a, b) => dist(a) - dist(b));
    const larger = all.filter((a) => a.adultSizeCm > size * 1.25).sort((a, b) => dist(a) - dist(b));
    return [
      { title: 'Plus petites', items: smaller.slice(0, 6) },
      { title: 'Taille voisine', items: similar.slice(0, 6) },
      { title: 'Plus grandes', items: larger.slice(0, 6) },
    ];
  }

  // Quantité qui garde la même charge (cm cumulés) avec l'espèce de remplacement.
  function sameLoadQty(l: DensityLine, alt: SpeciesReference) {
    const min = schoolMinOf(alt) ?? 1;
    if (l.sizeCm <= 0 || alt.adultSizeCm <= 0) return Math.max(l.quantity, min);
    return Math.max(min, Math.round((l.quantity * l.sizeCm) / alt.adultSizeCm));
  }

  // Remplace la ligne par l'alternative choisie, avec la même quantité.
  function swapWith(l: DensityLine, alt: SpeciesReference, qty: number) {
    if (l.hypothetical) setExtras((list) => list.filter((x) => x.id !== l.id));
    else setQty(l.id, 0);
    addExtra(alt, qty);
    setAltFor(null);
  }

  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Espèce absente du catalogue : la fiche vient de l'IA (nom, nom scientifique, taille).
  async function searchWithAi() {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/research-species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (d.category !== 'fish' && d.category !== 'invertebrate') throw new Error('Cette espèce n’est ni un poisson ni un invertébré.');
      addExtra({
        commonName: d.common_name || query.trim(),
        scientificName: d.scientific_name || '',
        category: d.category,
        bioloadFactor: d.bioload_factor ?? 1,
        adultSizeCm: d.adult_size_cm ?? 5,
        temperament: d.temperament ?? '',
        minTankLiters: d.min_tank_liters ?? 0,
        swimZone: d.swim_zone ?? 'mid',
        solitary: !!d.solitary,
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Recherche impossible, réessaie.');
    } finally {
      setAiBusy(false);
    }
  }

  function addExtra(s: SpeciesReference, qty?: number) {
    const quantity = qty ?? schoolMinOf(s) ?? 1;
    if (s.category !== 'fish' && s.category !== 'invertebrate') return;
    setExtras((list) => [
      ...list,
      {
        id: `extra-${Date.now()}-${list.length}`,
        name: s.commonName,
        scientificName: s.scientificName,
        sizeCm: s.adultSizeCm,
        quantity,
        kind: s.category as 'fish' | 'invertebrate',
        hypothetical: true,
        zone: s.swimZone,
      },
    ]);
    setQuery('');
    setSuggestions([]);
  }

  // Ouvre un projet ou une alternative : remplace le peuplement enregistré par ses lignes, le temps de la simulation.
  function loadProject(projectLines: DensityLine[]) {
    const zeroed: Record<string, number> = {};
    base.forEach((l) => (zeroed[l.id] = 0));
    setOverrides(zeroed);
    setExtras(projectLines);
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
            {(
              [
                ['fish', 'Poissons'],
                ['invertebrate', 'Invertébrés'],
              ] as const
            ).map(([kind, title]) => {
              const group = lines.filter((x) => x.kind === kind);
              if (group.length === 0) return null;
              const n = group.reduce((a, x) => a + Math.max(0, x.quantity), 0);
              const cm = group.reduce((a, x) => a + Math.max(0, x.sizeCm) * Math.max(0, x.quantity), 0);
              const eq = kind === 'invertebrate' ? cm * INVERTEBRATE_COEF : cm;
              return (
                <div key={kind} className="mb-3">
                  <div
                    className={`mb-1 flex flex-wrap items-baseline justify-between gap-1 rounded-lg px-3 py-1.5 ${
                      kind === 'fish' ? 'bg-sky-50 text-sky-800' : 'bg-violet-50 text-violet-800'
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      {kind === 'fish' ? '🐟' : '🦐'} {title} · {n}
                    </span>
                    <span className="text-xs">
                      {kind === 'fish'
                        ? `${fmt(cm, 0)} cm comptés en entier`
                        : `${fmt(cm, 0)} cm × ${INVERTEBRATE_COEF} = ${fmt(eq, 1)} cm équivalent poisson`}
                    </span>
                  </div>
            {group.map((l) => {
              const isExtra = !!l.hypothetical;
              return (
                <div key={l.id} className="border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">
                      {l.name}
                      {isExtra && (
                        <span className="ml-1.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                          hypothèse
                        </span>
                      )}
                    </p>
                    {l.scientificName && <p className="truncate text-xs italic text-slate-500">{l.scientificName}</p>}
                    {(() => {
                      const min = schoolMinByName(l.name, l.scientificName);
                      if (!min || l.quantity <= 0) return null;
                      return l.quantity < min ? (
                        <p className="text-xs text-amber-700">
                          Espèce de banc : {min} minimum conseillés, {l.quantity} seulement.
                        </p>
                      ) : null;
                    })()}
                    <p className="text-xs text-slate-400">
                      {l.kind === 'fish' ? 'poisson' : 'invertébré'} ·{' '}
                      {l.sizeCm > 0 ? `${fmt(l.sizeCm, 1)} cm adulte` : 'taille adulte manquante'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Alternatives à ${l.name}`}
                      title="Voir des espèces alternatives"
                      onClick={() => setAltFor(altFor === l.id ? null : l.id)}
                      className={`rounded-lg border p-1.5 hover:bg-slate-50 ${altFor === l.id ? 'border-teal-400 text-teal-700' : 'border-slate-200 text-slate-500'}`}
                    >
                      <Shuffle size={14} />
                    </button>
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
                {altFor === l.id && (
                  <div className="mb-2 rounded-lg bg-slate-50 p-2">
                    <p className="mb-1 text-xs text-slate-500">
                      Remplacer {l.quantity} {l.name} par une autre espèce paisible du même étage. La quantité proposée garde la même charge :
                    </p>
                    {groupedAlternatives(l).every((g) => g.items.length === 0) ? (
                      <p className="text-xs text-slate-400">Aucune alternative dans le catalogue pour ce volume.</p>
                    ) : (
                      groupedAlternatives(l).map((g) =>
                        g.items.length === 0 ? null : (
                          <div key={g.title} className="mb-1.5">
                            <p className="mb-1 text-xs font-medium text-slate-600">{g.title}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {g.items.map((a) => {
                                const q = sameLoadQty(l, a);
                                return (
                                  <button
                                    key={a.commonName}
                                    type="button"
                                    onClick={() => swapWith(l, a, q)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-xs hover:border-teal-400 hover:bg-teal-50"
                                  >
                                    <span className="font-medium text-slate-800">{a.commonName}</span>
                                    <span className="block italic text-slate-500">{a.scientificName}</span>
                                    <span className="text-slate-400">
                                      {a.adultSizeCm} cm · {q} pour la même charge
                                    </span>
                                    {schoolMinOf(a) && <span className="block text-teal-700">banc de {schoolMinOf(a)} minimum</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
                </div>
              );
            })}
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
            {query.trim().length >= 3 && suggestions.length === 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Pas dans le catalogue.</span>
                <button
                  type="button"
                  onClick={searchWithAi}
                  disabled={aiBusy}
                  className="rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                >
                  {aiBusy ? 'Recherche…' : `Chercher « ${query.trim()} » avec l'IA`}
                </button>
                {aiError && <span className="text-amber-700">{aiError}</span>}
              </div>
            )}
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.commonName}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addExtra(s)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-teal-50"
                    >
                      <span className="font-medium text-slate-800">{s.commonName}</span>
                      <span className="text-xs text-slate-400">
                        <i>{s.scientificName}</i> · {s.adultSizeCm} cm · {s.category === 'fish' ? 'poisson' : 'invertébré'}
                        {schoolMinOf(s) ? ` · banc de ${schoolMinOf(s)} mini` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-800">Charge par espace</p>
            <p className="mb-2 text-xs text-slate-500">
              Chaque étage compte pour un tiers du volume réel ({fmt(netLiters / 3, 0)} L). Les invertébrés sont au fond.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {zoneStats.map((z) => {
                const lv = densityLevel(z.ratio);
                const label = z.zone === 'top' ? 'Surface' : z.zone === 'mid' ? 'Milieu' : 'Fond';
                return (
                  <div key={z.zone} className={`rounded-lg p-2.5 ${LEVEL_STYLES[lv.id].box}`}>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-lg font-semibold">{fmt(z.ratio, 2)} cm/L</p>
                    <p className="text-xs">
                      {z.fish} poisson{z.fish > 1 ? 's' : ''}
                      {z.invertebrates > 0 ? ` · ${z.invertebrates} invertébré${z.invertebrates > 1 ? 's' : ''}` : ''} · {fmt(z.cm, 0)} cm · {lv.label.toLowerCase()}
                    </p>
                  </div>
                );
              })}
            </div>
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

          <DensityProjects tankId={tankId} lines={lines} netLiters={netLiters} onLoad={loadProject} />

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
