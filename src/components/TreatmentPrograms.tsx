'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, Tank, TreatmentProgram } from '@/types/database';
import { productCategoryOf } from '@/lib/products';
import { addDays, dateKey, diffDays, parseKey, programState, scheduleDates } from '@/lib/treatment';
import { CalendarRange, Check, Plus, Trash2, FlaskConical } from 'lucide-react';

const fmtMl = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 })} mL`;
const longDate = (k: string) => parseKey(k).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

const PRESETS: { label: string; days: number; every: number }[] = [
  { label: '7 jours, une dose par jour', days: 7, every: 1 },
  { label: '14 jours, une dose par jour', days: 14, every: 1 },
  { label: '4 semaines, une dose par semaine', days: 28, every: 7 },
];

export function TreatmentPrograms({
  tank,
  products,
  programs,
  unavailable,
  onUpdated,
}: {
  tank: Tank;
  products: Product[];
  programs: TreatmentProgram[];
  unavailable: boolean;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [today] = useState(() => dateKey(new Date()));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dosable = products.filter((p) => {
    const c = productCategoryOf(p);
    return c === 'bacteria' || c === 'conditioner' || c === 'fertilizer' || c === 'other' || p.dose_ml_per_100l !== null;
  });

  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, 6));
  const [every, setEvery] = useState('1');
  const [dose, setDose] = useState('');
  const [notes, setNotes] = useState('');

  const product = dosable.find((p) => p.id === productId) ?? null;
  const everyNum = Math.max(1, parseInt(every, 10) || 1);
  const preview = scheduleDates(start, end, everyNum);

  function pickProduct(id: string) {
    setProductId(id);
    const p = dosable.find((x) => x.id === id);
    if (!p) return;
    setName(`Traitement ${p.name}`);
    if (p.dose_ml_per_100l !== null) setDose(String(Math.round(((p.dose_ml_per_100l * tank.volume_liters) / 100) * 10) / 10));
  }

  function applyPreset(days: number, ev: number) {
    setEnd(addDays(start, days - 1));
    setEvery(String(ev));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !name.trim() || end < start) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('treatment_programs').insert({
      tank_id: tank.id,
      user_id: userData.user.id,
      product_id: product.id,
      product_name: product.name,
      name: name.trim(),
      start_date: start,
      end_date: end,
      every_days: everyNum,
      dose_ml: dose ? parseFloat(dose) : null,
      notes: notes.trim() || null,
      done_dates: [],
    });
    setBusy(false);
    if (err) {
      setError(`Création impossible : ${err.message}`);
      return;
    }
    setOpen(false);
    setProductId('');
    setName('');
    setNotes('');
    onUpdated();
  }

  async function toggleDose(p: TreatmentProgram, day: string) {
    const done = new Set(p.done_dates ?? []);
    const marking = !done.has(day);
    if (marking) done.add(day);
    else done.delete(day);
    await supabase.from('treatment_programs').update({ done_dates: Array.from(done).sort() }).eq('id', p.id);

    // Une dose cochée entre aussi dans le journal d'entretien.
    if (marking) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const base = {
          tank_id: tank.id,
          user_id: userData.user.id,
          task_type: 'dosing',
          description: `${p.name}${p.dose_ml ? `, ${fmtMl(p.dose_ml)}` : ''}`,
          performed_at: day === today ? new Date().toISOString() : parseKey(day).toISOString(),
        };
        const { error: logErr } = await supabase.from('maintenance_logs').insert({
          ...base,
          product_id: p.product_id,
          product_name: p.product_name,
          product_dose_ml: p.dose_ml,
        });
        if (logErr) await supabase.from('maintenance_logs').insert(base);
      }
    }
    onUpdated();
  }

  async function remove(id: string) {
    await supabase.from('treatment_programs').delete().eq('id', id);
    onUpdated();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={19} className="text-teal-700" />
          <h3 className="text-xl text-slate-900">Programmes de traitement</h3>
        </div>
        {!unavailable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <Plus size={15} /> Nouveau programme
          </button>
        )}
      </div>

      {unavailable && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Les programmes ne sont pas encore disponibles : lance la migration 0016_treatment_programs.sql dans Supabase.
        </p>
      )}

      {open && (
        <form onSubmit={create} className="mb-4 space-y-3 rounded-xl bg-slate-50 p-4">
          {dosable.length === 0 ? (
            <p className="text-sm text-slate-600">Ajoute d’abord un produit dans Mon bac &gt; Produits.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Produit</span>
                  <select
                    value={productId}
                    onChange={(e) => pickProduct(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">Choisir un produit</option>
                    {dosable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Nom du programme</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    required
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((pr) => (
                  <button
                    key={pr.label}
                    type="button"
                    onClick={() => applyPreset(pr.days, pr.every)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Début</span>
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" required />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Fin</span>
                  <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" required />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Une dose tous les (jours)</span>
                  <input type="number" min="1" value={every} onChange={(e) => setEvery(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Dose (mL)</span>
                  <input type="number" step="0.1" min="0" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="auto" className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" />
                </label>
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note (optionnel), par exemple : après nettoyage du filtre"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />

              <p className="text-sm text-slate-700">
                {preview.length} dose{preview.length > 1 ? 's' : ''} du {longDate(start)} au {longDate(end)}
                {dose && preview.length > 0 && <>, soit {fmtMl(parseFloat(dose) * preview.length)} au total</>}.
              </p>
              {product && productCategoryOf(product) === 'bacteria' && (
                <p className="text-xs text-teal-800">Bactéries liquides : à verser directement dans le bac, pas dans l’eau de remplacement.</p>
              )}
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || !product || end < start}
                className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? 'Création…' : 'Créer le programme'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="space-y-4">
        {programs.map((p) => {
          const st = programState(p, today);
          const pct = st.dates.length ? Math.round((st.doneCount / st.dates.length) * 100) : 0;
          const phaseLabel =
            st.phase === 'upcoming'
              ? `commence dans ${diffDays(today, p.start_date)} j`
              : st.phase === 'finished'
                ? st.doneCount >= st.dates.length
                  ? 'terminé'
                  : `terminé, ${st.dates.length - st.doneCount} dose(s) manquée(s)`
                : `jour ${st.dayIndex} sur ${st.totalDays}`;
          return (
            <article key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="flex items-center gap-1.5 text-lg text-slate-900">
                    <FlaskConical size={16} className="text-teal-700" /> {p.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {p.product_name}, du {longDate(p.start_date)} au {longDate(p.end_date)}
                    {p.every_days > 1 ? `, une dose tous les ${p.every_days} jours` : ', une dose par jour'}
                    {p.dose_ml ? `, ${fmtMl(p.dose_ml)} par dose` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      st.phase === 'running'
                        ? 'bg-teal-100 text-teal-800'
                        : st.phase === 'upcoming'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {phaseLabel}
                  </span>
                  <button type="button" onClick={() => remove(p.id)} aria-label={`Supprimer ${p.name}`} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {st.doneCount} dose{st.doneCount > 1 ? 's' : ''} sur {st.dates.length}
                {st.dueToday && <span className="ml-2 font-semibold text-teal-700">dose à faire aujourd’hui{p.dose_ml ? `, ${fmtMl(p.dose_ml)}` : ''}</span>}
                {!st.dueToday && st.overdue.length > 0 && st.phase === 'running' && (
                  <span className="ml-2 font-semibold text-amber-700">{st.overdue.length} dose(s) en retard</span>
                )}
                {!st.dueToday && st.next && st.phase !== 'finished' && st.overdue.length === 0 && (
                  <span className="ml-2">prochaine dose le {longDate(st.next)}</span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {st.dates.map((d) => {
                  const isDone = st.done.has(d);
                  const isToday = d === today;
                  const late = d < today && !isDone;
                  const future = d > today;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDose(p, d)}
                      disabled={future}
                      title={future ? 'Pas encore' : isDone ? 'Décocher' : 'Marquer comme faite'}
                      className={`flex min-w-[3.6rem] flex-col items-center rounded-lg border px-2 py-1 text-xs transition ${
                        isDone
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : isToday
                            ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-200'
                            : late
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="font-medium">{parseKey(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      <span>{isDone ? <Check size={13} /> : isToday ? 'aujourd’hui' : late ? 'à faire' : parseKey(d).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
              {p.notes && <p className="mt-2 text-xs text-slate-500">{p.notes}</p>}
            </article>
          );
        })}
        {programs.length === 0 && !unavailable && !open && (
          <p className="text-sm text-slate-400">
            Aucun programme. Crée-en un pour suivre un traitement du début à la fin, par exemple des bactéries une fois par jour pendant 7 jours.
          </p>
        )}
      </div>
    </section>
  );
}
