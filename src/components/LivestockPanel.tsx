'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock, LivestockCategory } from '@/types/database';
import { searchSpecies, type SpeciesReference } from '@/lib/species-catalog';
import { Trash2 } from 'lucide-react';

const CATEGORY_LABELS: Record<LivestockCategory, string> = {
  fish: 'Poisson',
  invertebrate: 'Invertébré',
  plant: 'Plante',
  coral: 'Corail',
};

export function LivestockPanel({ tankId, livestock, onUpdated }: {
  tankId: string;
  livestock: Livestock[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [category, setCategory] = useState<LivestockCategory>('fish');
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [bioloadFactor, setBioloadFactor] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SpeciesReference[]>([]);
  const [matchedSpecies, setMatchedSpecies] = useState<SpeciesReference | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setMatchedSpecies(null);
    setSuggestions(searchSpecies(value));
  }

  function applySuggestion(species: SpeciesReference) {
    setName(species.commonName);
    setScientificName(species.scientificName);
    setCategory(species.category);
    setBioloadFactor(String(species.bioloadFactor));
    setMatchedSpecies(species);
    setSuggestions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('livestock').insert({
      tank_id: tankId,
      user_id: user.id,
      category,
      species_common_name: name,
      species_scientific_name: scientificName || null,
      quantity: parseInt(quantity, 10),
      bioload_factor: parseFloat(bioloadFactor),
      temperament: matchedSpecies?.temperament ?? null,
      adult_size_cm: matchedSpecies?.adultSizeCm ?? null,
      min_tank_liters: matchedSpecies?.minTankLiters ?? null,
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
    setBioloadFactor('1');
    setMatchedSpecies(null);
    onUpdated();
  }

  async function handleDelete(id: string) {
    await supabase.from('livestock').delete().eq('id', id);
    onUpdated();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Ajouter au peuplement</h3>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-5">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LivestockCategory)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative sm:col-span-2">
            <input
              required
              placeholder="Nom commun (ex. Néon bleu)"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setSuggestions(searchSpecies(name))}
              onBlur={() => {
                blurTimeout.current = setTimeout(() => setSuggestions([]), 150);
              }}
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
        </div>
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
        <p className="mt-2 text-xs text-slate-400">
          Le nom commun propose des espèces courantes (facteur bioload, tempérament, sexage) —
          libre à toi de saisir n&apos;importe quelle autre espèce à la main.
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
        <h3 className="mb-3 font-semibold text-slate-900">Peuplement actuel</h3>
        <div className="space-y-2">
          {livestock.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div>
                <span className="font-medium text-slate-800">
                  {item.quantity}× {item.species_common_name}
                </span>
                <span className="ml-2 text-xs text-slate-400">
                  {CATEGORY_LABELS[item.category]}
                  {item.species_scientific_name ? ` · ${item.species_scientific_name}` : ''}
                  {item.temperament ? ` · ${item.temperament}` : ''}
                  {item.min_tank_liters ? ` · dès ${item.min_tank_liters} L` : ''}
                </span>
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {livestock.length === 0 && <p className="text-sm text-slate-400">Aucun peuplement renseigné</p>}
        </div>
      </div>
    </div>
  );
}
