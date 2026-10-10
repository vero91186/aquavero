'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock } from '@/types/database';
import { proposeIntroDates, toIsoDay } from '@/lib/intro-dates';

const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });

// Propose une date d'introduction à chaque animal pas encore au bac. On coche ceux qui
// restent à introduire (par défaut : date vide ou à venir), le reste compte comme déjà fait.
export function IntroDatesPlanner({ livestock, onUpdated }: { livestock: Livestock[]; onUpdated: () => void }) {
  const supabase = createClient();
  const animals = useMemo(
    () => livestock.filter((l) => l.category === 'fish' || l.category === 'invertebrate'),
    [livestock]
  );
  const [today] = useState(() => new Date());
  const todayIso = toIsoDay(today);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(
    () => new Set(animals.filter((l) => !l.added_at || l.added_at > todayIso).map((l) => l.id)),
    [animals, todayIso]
  );
  const planned = picked ?? defaults;
  const { day0, hasIntroduced, dates } = useMemo(() => proposeIntroDates(animals, planned, today), [animals, planned, today]);
  const dateOf = new Map(dates.map((d) => [d.id, d]));

  function toggle(id: string) {
    const next = new Set(planned);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  async function apply() {
    setSaving(true);
    setError(null);
    for (const d of dates) {
      const { error } = await supabase.from('livestock').update({ added_at: toIsoDay(d.date) }).eq('id', d.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setPicked(null);
    setOpen(false);
    onUpdated();
  }

  if (animals.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm text-teal-800 hover:bg-teal-100"
      >
        <CalendarClock size={15} /> Calculer les dates d&apos;introduction
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <CalendarClock size={18} className="text-teal-600" /> Dates d&apos;introduction proposées
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Coche les animaux qui ne sont pas encore dans le bac. Ordre conseillé : crevettes et escargots, puis poissons robustes et
        corydoras, puis territoriaux, puis espèces sensibles.{' '}
        {hasIntroduced ? `Jour 0 : ${fmtDate(day0)}.` : "Rien n'est encore introduit : l'étape 1 commence aujourd'hui."} Avant chaque
        étape, NO2 à 0 et NO3 sous 25 aux deux derniers tests.
      </p>
      <ul className="mt-3 divide-y divide-slate-100">
        {animals.map((l) => {
          const p = dateOf.get(l.id);
          const isPlanned = planned.has(l.id);
          return (
            <li key={l.id} className="flex items-start gap-3 py-2">
              <input type="checkbox" checked={isPlanned} onChange={() => toggle(l.id)} className="mt-1" aria-label={`${l.species_common_name} pas encore au bac`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">
                  {l.quantity}× {l.species_common_name}
                </p>
                {isPlanned && p ? (
                  <p className="text-xs text-teal-700">
                    {fmtDate(p.date)} · étape {p.step}, {p.stepTitle.toLowerCase()}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    {l.added_at && l.added_at <= todayIso
                      ? `déjà au bac depuis le ${new Date(`${l.added_at}T12:00:00`).toLocaleDateString('fr-FR')}`
                      : 'décoché : date inchangée'}
                  </p>
                )}
                {isPlanned && p && l.category === 'fish' && l.quantity > 10 && (
                  <p className="text-xs text-amber-700">
                    {l.quantity} individus : introduis-les par lots de 8 à 10, à 3 ou 4 jours d&apos;écart. La date est celle du premier lot.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={saving || dates.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Enregistrer ces dates
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:underline">
          Fermer
        </button>
      </div>
    </div>
  );
}
