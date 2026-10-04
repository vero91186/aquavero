'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PlantInfo, CustomSpecies, Livestock, LivestockCategory, SwimZone } from '@/types/database';
import { searchSpecies, type SpeciesReference } from '@/lib/species-catalog';
import { fileToBase64 } from '@/lib/image';
import { fetchAutoPhoto } from '@/lib/find-photo-client';
import { scientificNameOf } from '@/lib/species-catalog';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ConfidenceBadge, SourcesLine } from '@/components/research-ui';
import { GoogleSearchLink } from '@/components/GoogleSearchLink';
import { Trash2, Camera, Loader2, Pencil, Check, X, Search, Sparkles } from 'lucide-react';

const CATEGORY_LABELS: Record<LivestockCategory, string> = {
  fish: 'Poisson',
  invertebrate: 'Invertébré',
  plant: 'Plante',
  coral: 'Corail',
};

const SWIM_ZONE_LABELS: Record<SwimZone, string> = {
  top: 'Surface',
  mid: 'Pleine eau',
  bottom: 'Fond',
};

interface IdentifyCandidate {
  common_name: string;
  scientific_name: string;
  category: LivestockCategory;
  confidence: number;
  care_note: string;
}

export function LivestockPanel({
  tankId,
  livestock,
  onUpdated,
  categories,
  lockedCategory,
  title,
  listTitle,
  customSpecies,
}: {
  tankId: string;
  livestock: Livestock[];
  onUpdated: () => void;
  // Catégories affichées dans la liste et proposées dans le sélecteur d'ajout.
  // Par défaut : toutes.
  categories?: LivestockCategory[];
  // Si renseigné, le formulaire ajoute toujours dans cette catégorie (pas de
  // sélecteur affiché) — utilisé par l'onglet Plantes.
  lockedCategory?: LivestockCategory;
  title?: string;
  listTitle?: string;
  // Espèces trouvées par l'IA lors de recherches précédentes (voir
  // handleResearchSpecies) : viennent enrichir les suggestions du catalogue
  // intégré au fil du temps.
  customSpecies?: CustomSpecies[];
}) {
  const supabase = createClient();
  const visibleCategories = categories ?? (Object.keys(CATEGORY_LABELS) as LivestockCategory[]);
  const [category, setCategory] = useState<LivestockCategory>(lockedCategory ?? visibleCategories[0]);
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [bioloadFactor, setBioloadFactor] = useState(lockedCategory === 'plant' ? '0' : '1');
  const [swimZone, setSwimZone] = useState<SwimZone>('mid');
  const [solitary, setSolitary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SpeciesReference[]>([]);
  const [matchedSpecies, setMatchedSpecies] = useState<SpeciesReference | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    scientificName: string;
    quantity: string;
    bioloadFactor: string;
    swimZone: SwimZone;
    solitary: boolean;
  }>({
    name: '',
    scientificName: '',
    quantity: '',
    bioloadFactor: '',
    swimZone: 'mid',
    solitary: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [identifying, setIdentifying] = useState(false);
  const [identifyCandidates, setIdentifyCandidates] = useState<IdentifyCandidate[]>([]);
  const [identifyNote, setIdentifyNote] = useState<string | null>(null);

  const [researchingSpecies, setResearchingSpecies] = useState(false);
  const [speciesResearch, setSpeciesResearch] = useState<{
    common_name: string;
    scientific_name: string;
    category: LivestockCategory;
    temperament: string | null;
    adult_size_cm: number | null;
    min_tank_liters: number | null;
    bioload_factor: number | null;
    swim_zone: SwimZone;
    solitary: boolean;
    care_note: string;
  } | null>(null);
  // Infos issues d'une fiche IA appliquée (pas du catalogue statique) : à
  // transmettre à l'insertion en base, séparément de matchedSpecies.
  const [aiSpeciesInfo, setAiSpeciesInfo] = useState<{
    temperament: string | null;
    adultSizeCm: number | null;
    minTankLiters: number | null;
  } | null>(null);

  const filteredLivestock = livestock.filter((l) => visibleCategories.includes(l.category));

  // Convertit une espèce mémorisée via l'IA (table custom_species) au même
  // format que le catalogue statique, pour réutiliser applySuggestion tel quel.
  function toSpeciesReference(c: CustomSpecies): SpeciesReference {
    return {
      commonName: c.common_name,
      scientificName: c.scientific_name,
      category: c.category,
      bioloadFactor: c.bioload_factor ?? 1,
      adultSizeCm: c.adult_size_cm ?? 0,
      temperament: c.temperament ?? '',
      minTankLiters: c.min_tank_liters ?? 0,
      swimZone: c.swim_zone,
      solitary: c.solitary,
    };
  }

  function searchAllSpecies(value: string): SpeciesReference[] {
    const fromCatalog = searchSpecies(value);
    const q = value.trim().toLowerCase();
    const fromCustom =
      q.length >= 2
        ? (customSpecies ?? [])
            .filter(
              (c) => c.common_name.toLowerCase().includes(q) || c.scientific_name.toLowerCase().includes(q)
            )
            .map(toSpeciesReference)
        : [];
    // Évite les doublons si une espèce IA porte le même nom qu'une entrée du catalogue.
    const seen = new Set(fromCatalog.map((s) => s.scientificName.toLowerCase()));
    return [...fromCatalog, ...fromCustom.filter((s) => !seen.has(s.scientificName.toLowerCase()))].slice(0, 15);
  }

  function handleNameChange(value: string) {
    setName(value);
    setMatchedSpecies(null);
    setAiSpeciesInfo(null);
    setSpeciesResearch(null);
    setSuggestions(searchAllSpecies(value));
  }

  function applySuggestion(species: SpeciesReference) {
    setName(species.commonName);
    setScientificName(species.scientificName);
    if (!lockedCategory) setCategory(species.category);
    setBioloadFactor(String(species.bioloadFactor));
    setSwimZone(species.swimZone);
    setSolitary(species.solitary);
    setMatchedSpecies(species);
    setAiSpeciesInfo(null);
    setSpeciesResearch(null);
    setSuggestions([]);
  }

  function applyCandidate(c: IdentifyCandidate) {
    setName(c.common_name);
    setScientificName(c.scientific_name);
    if (!lockedCategory) setCategory(c.category);
    setMatchedSpecies(null);
    setAiSpeciesInfo(null);
    setSpeciesResearch(null);
    setIdentifyCandidates([]);
    setIdentifyNote(c.care_note);
    // Recherche une correspondance dans le catalogue pour préremplir le bioload/tempérament.
    const match = searchAllSpecies(c.common_name)[0] ?? searchAllSpecies(c.scientific_name)[0];
    if (match) {
      setBioloadFactor(String(match.bioloadFactor));
      setSwimZone(match.swimZone);
      setSolitary(match.solitary);
      setMatchedSpecies(match);
    } else {
      setSwimZone('mid');
      setSolitary(false);
    }
  }

  async function handleResearchSpecies() {
    if (!name.trim()) return;
    setResearchingSpecies(true);
    setError(null);
    setSpeciesResearch(null);
    try {
      const res = await fetch('/api/ai/research-species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scientificName || name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSpeciesResearch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche IA');
    } finally {
      setResearchingSpecies(false);
    }
  }

  // Applique la fiche IA au formulaire ET la mémorise dans la base
  // (custom_species) pour qu'elle apparaisse directement dans les
  // suggestions la prochaine fois — c'est ce qui "renforce" le catalogue.
  async function applySpeciesResearch() {
    if (!speciesResearch) return;
    const r = speciesResearch;
    setName(r.common_name || name);
    setScientificName(r.scientific_name || scientificName);
    if (!lockedCategory) setCategory(r.category);
    if (r.bioload_factor !== null) setBioloadFactor(String(r.bioload_factor));
    setSwimZone(r.swim_zone);
    setSolitary(r.solitary);
    setMatchedSpecies(null);
    setAiSpeciesInfo({
      temperament: r.temperament,
      adultSizeCm: r.adult_size_cm,
      minTankLiters: r.min_tank_liters,
    });
    setSpeciesResearch(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('custom_species').insert({
        user_id: user.id,
        common_name: r.common_name,
        scientific_name: r.scientific_name,
        category: r.category,
        temperament: r.temperament,
        adult_size_cm: r.adult_size_cm,
        min_tank_liters: r.min_tank_liters,
        bioload_factor: r.bioload_factor,
        swim_zone: r.swim_zone,
        solitary: r.solitary,
        care_note: r.care_note,
      });
      onUpdated();
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdentifying(true);
    setError(null);
    setIdentifyNote(null);
    setIdentifyCandidates([]);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch('/api/ai/identify-species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, imageMimeType: mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const candidates = (data.candidates ?? []) as IdentifyCandidate[];
      if (candidates.length === 0) {
        setIdentifyNote("Aucune espèce reconnue sur cette photo — essaie une photo plus nette ou plus rapprochée.");
      } else if (candidates.length === 1) {
        applyCandidate(candidates[0]);
      } else {
        setIdentifyCandidates(candidates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de reconnaissance photo');
    } finally {
      setIdentifying(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Recherche automatique d'une photo sur internet à partir du nom (scientifique
    // en priorité, plus fiable pour trouver la bonne espèce).
    const photoUrl = await fetchAutoPhoto(scientificName || name, 'species');

    const { error } = await supabase.from('livestock').insert({
      tank_id: tankId,
      user_id: user.id,
      category: lockedCategory ?? category,
      species_common_name: name,
      species_scientific_name: scientificName || null,
      quantity: parseInt(quantity, 10),
      bioload_factor: parseFloat(bioloadFactor),
      temperament: matchedSpecies?.temperament ?? aiSpeciesInfo?.temperament ?? null,
      adult_size_cm: matchedSpecies?.adultSizeCm ?? aiSpeciesInfo?.adultSizeCm ?? null,
      min_tank_liters: matchedSpecies?.minTankLiters ?? aiSpeciesInfo?.minTankLiters ?? null,
      swim_zone: swimZone,
      solitary,
      photo_url: photoUrl,
      added_at: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName('');
    setScientificName('');
    setQuantity('1');
    setBioloadFactor(lockedCategory === 'plant' ? '0' : '1');
    setSwimZone('mid');
    setSolitary(false);
    setMatchedSpecies(null);
    setAiSpeciesInfo(null);
    setIdentifyNote(null);
    onUpdated();
  }

  async function handleDelete(id: string) {
    await supabase.from('livestock').delete().eq('id', id);
    onUpdated();
  }

  const [findingPhotoId, setFindingPhotoId] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  // Cherche une photo pour un élément déjà enregistré qui n'en a pas.
  async function handleFindPhoto(item: Livestock) {
    setFindingPhotoId(item.id);
    setPhotoNote(null);
    const url = await fetchAutoPhoto(item.species_scientific_name || item.species_common_name, 'species');
    setFindingPhotoId(null);
    if (url) await handlePhotoChange(item.id, url);
    else setPhotoNote(`Pas de photo fiable trouvée pour ${item.species_common_name} : ajoutes-en une avec l'appareil photo.`);
  }

  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [plantNote, setPlantNote] = useState<string | null>(null);
  const [openSheets, setOpenSheets] = useState<Record<string, boolean>>({});

  // Fiche précise d'une plante : recherche IA, enregistrée sur la ligne.
  async function researchOne(item: Livestock): Promise<boolean> {
    setResearchingId(item.id);
    try {
      const res = await fetch('/api/ai/research-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.species_common_name,
          scientificName: scientificNameOf(item.species_common_name, item.species_scientific_name),
        }),
      });
      if (!res.ok) throw new Error('recherche');
      const info = (await res.json()) as PlantInfo;
      const patch: Record<string, unknown> = { plant_info: info };
      if (info.height_cm) patch.adult_size_cm = info.height_cm;
      if (info.scientific_name && !item.species_scientific_name) patch.species_scientific_name = info.scientific_name;
      const { error } = await supabase.from('livestock').update(patch).eq('id', item.id);
      if (error) {
        setPlantNote('Fiche impossible à enregistrer : lance d’abord la migration 0017 dans Supabase.');
        return false;
      }
      setOpenSheets((o) => ({ ...o, [item.id]: true }));
      return true;
    } catch {
      setPlantNote(`Recherche impossible pour ${item.species_common_name}, réessaie dans un instant.`);
      return false;
    } finally {
      setResearchingId(null);
    }
  }

  async function handleResearch(item: Livestock) {
    setPlantNote(null);
    if (await researchOne(item)) onUpdated();
  }

  async function researchAllPlants() {
    setPlantNote(null);
    for (const it of livestock.filter((l) => l.category === 'plant' && !l.plant_info)) {
      if (!(await researchOne(it))) break;
    }
    onUpdated();
  }

  async function handlePhotoChange(id: string, url: string | null) {
    await supabase.from('livestock').update({ photo_url: url }).eq('id', id);
    onUpdated();
  }

  function startEdit(item: Livestock) {
    setEditingId(item.id);
    setEditForm({
      name: item.species_common_name,
      scientificName: item.species_scientific_name ?? '',
      quantity: String(item.quantity),
      bioloadFactor: String(item.bioload_factor),
      swimZone: item.swim_zone,
      solitary: item.solitary,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    await supabase
      .from('livestock')
      .update({
        species_common_name: editForm.name,
        species_scientific_name: editForm.scientificName || null,
        quantity: parseInt(editForm.quantity, 10) || 0,
        bioload_factor: parseFloat(editForm.bioloadFactor) || 0,
        swim_zone: editForm.swimZone,
        solitary: editForm.solitary,
      })
      .eq('id', id);
    setSavingEdit(false);
    setEditingId(null);
    onUpdated();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{title ?? 'Ajouter au peuplement'}</h3>
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50">
            {identifying ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            Identifier par photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {identifyNote && <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">{identifyNote}</p>}
        {identifyCandidates.length > 0 && (
          <div className="mb-3 space-y-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
            <p className="text-xs font-medium text-teal-700">Plusieurs espèces possibles, choisis la bonne :</p>
            {identifyCandidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyCandidate(c)}
                className="flex w-full flex-col items-start rounded-lg bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-teal-100"
              >
                <span className="font-medium text-slate-800">
                  {c.common_name} <span className="text-xs text-slate-400">({Math.round(c.confidence * 100)}% confiance)</span>
                </span>
                <span className="text-xs italic text-slate-400">{c.scientific_name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-5">
          {!lockedCategory && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LivestockCategory)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1"
            >
              {visibleCategories.map((value) => (
                <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          )}
          <div className={`relative sm:col-span-2 ${lockedCategory ? 'sm:col-start-1' : ''}`}>
            <input
              required
              placeholder={lockedCategory === 'plant' ? 'Nom commun (ex. Anubias nana)' : 'Nom commun (ex. Néon bleu)'}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setSuggestions(searchAllSpecies(name))}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => setSuggestions([]), 150);
              }}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.commonName}>
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
            placeholder="Nom scientifique (optionnel)"
            value={scientificName}
            onChange={(e) => setScientificName(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <input
            type="number"
            min="1"
            placeholder="Quantité"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          {lockedCategory !== 'plant' && (
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Facteur bioload"
              value={bioloadFactor}
              onChange={(e) => setBioloadFactor(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              title="1 = poisson standard type néon, ajuster selon la taille adulte"
            />
          )}
          {lockedCategory !== 'plant' && (
            <select
              value={swimZone}
              onChange={(e) => setSwimZone(e.target.value as SwimZone)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              title="Zone de nage principale"
            >
              {(Object.keys(SWIM_ZONE_LABELS) as SwimZone[]).map((z) => (
                <option key={z} value={z}>{SWIM_ZONE_LABELS[z]}</option>
              ))}
            </select>
          )}
          {lockedCategory !== 'plant' && (
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={solitary} onChange={(e) => setSolitary(e.target.checked)} />
              Espèce solitaire
            </label>
          )}
        </div>

        {suggestions.length === 0 && name.trim().length >= 2 && !matchedSpecies && !speciesResearch && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={handleResearchSpecies}
              disabled={researchingSpecies}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
            >
              {researchingSpecies ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              &quot;{name}&quot; pas dans la liste ? Rechercher avec l&apos;IA
            </button>
            {researchingSpecies && (
              <span className="text-xs text-slate-400">Peut prendre quelques secondes si l&apos;IA est très sollicitée.</span>
            )}
            <GoogleSearchLink query={`${name} aquarium poisson plante`} />
          </div>
        )}

        {speciesResearch && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-600" />
              <p className="text-sm font-medium text-slate-800">
                {speciesResearch.common_name}{' '}
                <span className="text-xs italic text-slate-400">({speciesResearch.scientific_name})</span>
              </p>
            </div>
            {(speciesResearch.temperament || speciesResearch.adult_size_cm !== null || speciesResearch.min_tank_liters !== null) && (
              <p className="text-xs text-slate-600">
                {speciesResearch.temperament}
                {speciesResearch.adult_size_cm !== null ? ` · taille adulte ~${speciesResearch.adult_size_cm} cm` : ''}
                {speciesResearch.min_tank_liters !== null ? ` · bac conseillé à partir de ${speciesResearch.min_tank_liters} L` : ''}
              </p>
            )}
            <p className="text-xs text-slate-500">{speciesResearch.care_note}</p>
            <button
              type="button"
              onClick={applySpeciesResearch}
              className="mt-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Utiliser cette fiche
            </button>
          </div>
        )}

        {matchedSpecies && (
          <div className="mt-3 space-y-1.5">
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
              {matchedSpecies.temperament} · taille adulte ~{matchedSpecies.adultSizeCm} cm · bac
              conseillé à partir de {matchedSpecies.minTankLiters} L
            </p>
            {matchedSpecies.sexNote && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                À savoir sur le sexage : {matchedSpecies.sexNote}
              </p>
            )}
          </div>
        )}
        {aiSpeciesInfo && !matchedSpecies && (
          <div className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">
            Fiche IA appliquée{aiSpeciesInfo.temperament ? ` — ${aiSpeciesInfo.temperament}` : ''}
            {aiSpeciesInfo.adultSizeCm !== null ? ` · ~${aiSpeciesInfo.adultSizeCm} cm` : ''}
            {aiSpeciesInfo.minTankLiters !== null ? ` · bac dès ${aiSpeciesInfo.minTankLiters} L` : ''} — mémorisée
            pour la prochaine fois.
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Le nom commun propose des espèces courantes, ou prends une photo pour une identification
          par IA — libre à toi de saisir n&apos;importe quelle autre espèce à la main.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">{listTitle ?? 'Peuplement actuel'}</h3>
        {plantNote && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{plantNote}</p>}
        {livestock.some((l) => l.category === 'plant' && !l.plant_info) && (
          <button
            type="button"
            onClick={researchAllPlants}
            disabled={researchingId !== null}
            className="mb-3 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs text-teal-800 hover:bg-teal-100 disabled:opacity-50"
          >
            {researchingId ? 'Recherche en cours…' : 'Compléter toutes les fiches de plantes'}
          </button>
        )}
        {photoNote && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{photoNote}</p>}
        <div className="space-y-2">
          {filteredLivestock.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="min-w-[8rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nom commun</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="min-w-[8rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nom scientifique</label>
                  <input
                    value={editForm.scientificName}
                    onChange={(e) => setEditForm((f) => ({ ...f, scientificName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Quantité</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                {item.category !== 'plant' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Bioload</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editForm.bioloadFactor}
                      onChange={(e) => setEditForm((f) => ({ ...f, bioloadFactor: e.target.value }))}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                  </div>
                )}
                {item.category !== 'plant' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Zone de nage</label>
                    <select
                      value={editForm.swimZone}
                      onChange={(e) => setEditForm((f) => ({ ...f, swimZone: e.target.value as SwimZone }))}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      {(Object.keys(SWIM_ZONE_LABELS) as SwimZone[]).map((z) => (
                        <option key={z} value={z}>{SWIM_ZONE_LABELS[z]}</option>
                      ))}
                    </select>
                  </div>
                )}
                {item.category !== 'plant' && (
                  <label className="flex items-center gap-1.5 pb-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={editForm.solitary}
                      onChange={(e) => setEditForm((f) => ({ ...f, solitary: e.target.checked }))}
                    />
                    Solitaire
                  </label>
                )}
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEdit(item.id)}
                    disabled={savingEdit}
                    className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    title="Enregistrer"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEdit} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Annuler">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-3">
                  <PhotoUpload
                    photoUrl={item.photo_url}
                    folder="livestock"
                    size="sm"
                    onChange={(url) => handlePhotoChange(item.id, url)}
                  />
                  <div>
                    {!item.photo_url && (
                      <button
                        type="button"
                        onClick={() => handleFindPhoto(item)}
                        disabled={findingPhotoId === item.id}
                        className="mb-1 block rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                      >
                        {findingPhotoId === item.id ? 'Recherche…' : 'Trouver une photo'}
                      </button>
                    )}
                    <span className="font-medium text-slate-800">
                      {item.quantity}× {item.species_common_name}
                    </span>
                    {scientificNameOf(item.species_common_name, item.species_scientific_name) && (
                      <span className="ml-2 text-sm italic text-slate-500">
                        {scientificNameOf(item.species_common_name, item.species_scientific_name)}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-slate-400">
                      {CATEGORY_LABELS[item.category]}
                      {item.category !== 'plant' ? ` · ${SWIM_ZONE_LABELS[item.swim_zone]}` : ''}
                      {item.temperament ? ` · ${item.temperament}` : ''}
                      {item.min_tank_liters ? ` · dès ${item.min_tank_liters} L` : ''}
                      {item.solitary && item.quantity > 1 ? ' · ⚠️ solitaire, à séparer' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {item.category === 'plant' && (
                    <button
                      type="button"
                      onClick={() => (item.plant_info ? setOpenSheets((o) => ({ ...o, [item.id]: !o[item.id] })) : handleResearch(item))}
                      disabled={researchingId === item.id}
                      className="mr-1 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                    >
                      {researchingId === item.id ? 'Recherche…' : item.plant_info ? (openSheets[item.id] ? 'Masquer la fiche' : 'Fiche précise') : 'Fiche précise'}
                    </button>
                  )}
                  <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-teal-600" title="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
                {item.plant_info && openSheets[item.id] && <PlantSheet info={item.plant_info} onRefresh={() => handleResearch(item)} busy={researchingId === item.id} />}
              </div>
            )
          )}
          {filteredLivestock.length === 0 && <p className="text-sm text-slate-400">Rien d&apos;enregistré pour l&apos;instant</p>}
        </div>
      </div>
    </div>
  );
}

function PlantSheet({ info, onRefresh, busy }: { info: PlantInfo; onRefresh: () => void; busy: boolean }) {
  const dims =
    info.height_cm || info.width_cm
      ? `${info.height_cm ?? '?'} cm de haut × ${info.width_cm ?? '?'} cm de large`
      : null;
  const rows: [string, string | null][] = [
    ['Origine', info.origin],
    ['Placement', info.placement],
    ['Taille adulte', dims],
    ['Croissance', info.growth],
    ['Lumière', info.light],
    ['CO₂', info.co2],
    ['Difficulté', info.difficulty],
    ['Température', info.temperature],
    ['Eau (pH, dureté)', info.water],
    ['Plantation', info.planting],
    ['Entretien', info.care],
    ['Multiplication', info.propagation],
    ['Rôle', info.role],
  ];
  return (
    <div className="basis-full space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge confidence={info.confidence} />
        {info.identified_name && <span className="text-xs text-slate-500">Identifiée : {info.identified_name}</span>}
        <button type="button" onClick={onRefresh} disabled={busy} className="ml-auto text-xs text-teal-700 underline disabled:opacity-50">
          {busy ? 'Recherche…' : 'Actualiser'}
        </button>
      </div>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[9rem_1fr]">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-800">{v}</dd>
          </div>
        ))}
      </dl>
      {info.note && <p className="text-xs text-amber-800">{info.note}</p>}
      <SourcesLine sourceUrl={info.source_url} sources={info.sources} />
    </div>
  );
}
