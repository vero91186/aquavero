'use client';

import { useState } from 'react';
import { Plus, Trash2, Utensils, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { FeedingPlanItem, FeedingSlot, MaintenanceLog, Product, Tank } from '@/types/database';
import { productCategoryOf } from '@/lib/products';
import { DEFAULT_FEEDING_PLAN, feedingLogText, itemsForDay, mealLogs, SLOT_LABELS, WEEKDAYS, weekdayOf } from '@/lib/feeding';

export function FeedingPlan({
  tank,
  items,
  logs,
  products,
  unavailable,
  onUpdated,
}: {
  tank: Tank;
  items: FeedingPlanItem[];
  logs: MaintenanceLog[];
  products: Product[];
  unavailable: boolean;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [today] = useState(() => new Date());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [weekday, setWeekday] = useState(weekdayOf(new Date()));
  const [slot, setSlot] = useState<FeedingSlot>('evening');
  const [food, setFood] = useState('');
  const [quantity, setQuantity] = useState('');

  const foods = products.filter((p) => productCategoryOf(p) === 'food');
  const todayIndex = weekdayOf(today);
  const todayItems = itemsForDay(items, todayIndex);

  if (unavailable) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-xl text-slate-900">
          <Utensils size={19} className="text-teal-700" /> Planning de nourrissage
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          La table du planning de nourrissage n&apos;existe pas encore dans Supabase : exécute la migration <code>0019_feeding_plan.sql</code> (éditeur SQL), puis recharge la page.
        </p>
      </section>
    );
  }

  async function insertItems(rows: { weekday: number; slot: FeedingSlot; food_name: string; quantity: string | null; notes: string | null }[]) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    setError(null);
    const { error: err } = await supabase
      .from('feeding_plan_items')
      .insert(rows.map((r) => ({ ...r, tank_id: tank.id, user_id: userData.user!.id })));
    if (err) {
      setError(`Impossible d’enregistrer : ${err.message}`);
      return false;
    }
    return true;
  }

  async function loadDefault() {
    setBusy('default');
    if (await insertItems(DEFAULT_FEEDING_PLAN)) onUpdated();
    setBusy(null);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!food.trim()) return;
    setBusy('add');
    const ok = await insertItems([{ weekday, slot, food_name: food.trim(), quantity: quantity.trim() || null, notes: null }]);
    setBusy(null);
    if (ok) {
      setFood('');
      setQuantity('');
      setAdding(false);
      onUpdated();
    }
  }

  async function removeItem(id: string) {
    setBusy(id);
    setError(null);
    const { error: err } = await supabase.from('feeding_plan_items').delete().eq('id', id);
    if (err) setError(`Impossible de supprimer : ${err.message}`);
    setBusy(null);
    onUpdated();
  }

  // Cocher un repas l'ajoute au journal (type Alimentation) ; décocher retire cette entrée.
  async function toggleMeal(item: FeedingPlanItem, done: boolean) {
    setBusy(item.id);
    setError(null);
    if (done) {
      const mine = mealLogs(item, logs, today);
      if (mine.length > 0) {
        const { error: err } = await supabase.from('maintenance_logs').delete().in('id', mine.map((l) => l.id));
        if (err) setError(`Impossible de décocher : ${err.message}`);
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const base = {
          tank_id: tank.id,
          user_id: userData.user.id,
          task_type: 'feeding',
          description: feedingLogText(item),
          performed_at: new Date().toISOString(),
        };
        const { error: err } = await supabase.from('maintenance_logs').insert({ ...base, product_name: item.food_name });
        // Colonne product_name absente (migration 0012 non appliquée) : on note sans.
        if (err) {
          const { error: err2 } = await supabase.from('maintenance_logs').insert(base);
          if (err2) setError(`Impossible de cocher : ${err2.message}`);
        }
      }
    }
    setBusy(null);
    onUpdated();
  }

  const renderItem = (it: FeedingPlanItem, withCheck: boolean) => {
    const done = mealLogs(it, logs, today).length > 0;
    return (
      <li key={it.id} className="flex items-start gap-3 py-2">
        {withCheck && (
          <input
            type="checkbox"
            checked={done}
            disabled={busy === it.id}
            onChange={() => toggleMeal(it, done)}
            aria-label={`${it.food_name} : ${done ? 'donné' : 'à donner'}`}
            className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-teal-600"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${withCheck && done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {it.food_name}
            {it.quantity && <span className="ml-2 font-normal text-slate-500">{it.quantity}</span>}
          </p>
          {!withCheck && <p className="text-xs text-slate-400">{it.slot === 'morning' ? 'Matin' : 'Soir'}</p>}
          {it.notes && <p className="text-xs text-slate-500">{it.notes}</p>}
        </div>
        {!withCheck && (
          <button
            type="button"
            onClick={() => removeItem(it.id)}
            disabled={busy === it.id}
            className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
            aria-label={`Retirer ${it.food_name}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </li>
    );
  };

  const renderSlots = (list: FeedingPlanItem[]) =>
    (['morning', 'evening'] as FeedingSlot[]).map((s) => {
      const slotItems = list.filter((i) => i.slot === s);
      if (slotItems.length === 0) return null;
      return (
        <div key={s} className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{SLOT_LABELS[s]}</p>
          <ul className="divide-y divide-slate-100">{slotItems.map((i) => renderItem(i, true))}</ul>
        </div>
      );
    });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xl text-slate-900">
          <Utensils size={19} className="text-teal-700" /> Planning de nourrissage
        </h3>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-sm text-teal-800 hover:bg-teal-100"
          >
            <Plus size={14} /> Ajouter un repas
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Les quantités sont des repères : si de la nourriture reste le lendemain matin, réduis ; si tout disparaît en moins d&apos;une heure, augmente un peu. Retire les restes après quelques heures.
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-600">Aucun planning pour l&apos;instant.</p>
          <button
            type="button"
            onClick={loadDefault}
            disabled={busy === 'default'}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Wand2 size={15} /> Charger le planning conseillé
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Pensé pour 30 crevettes, des escargots, un ancistrus et un tétra : flocons le matin, paillettes, pastilles ou courgette le soir, jeûne le dimanche. Tu pourras tout modifier.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">Aujourd&apos;hui, {WEEKDAYS[todayIndex].toLowerCase()}</p>
            {todayItems.length === 0 ? (
              <p className="py-2 text-sm text-slate-500">Jour de jeûne : ils se nourrissent du biofilm et des algues.</p>
            ) : (
              renderSlots(todayItems)
            )}
          </div>

          {adding && (
            <form onSubmit={addItem} className="mt-3 grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {WEEKDAYS.map((w, i) => (
                  <option key={w} value={i}>
                    {w}
                  </option>
                ))}
              </select>
              <select value={slot} onChange={(e) => setSlot(e.target.value as FeedingSlot)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="morning">Matin</option>
                <option value="evening">Soir</option>
              </select>
              <input
                list="feeding-foods"
                value={food}
                onChange={(e) => setFood(e.target.value)}
                placeholder="Aliment (ex. JBL ProNovo Bel Flakes S)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <datalist id="feeding-foods">
                {foods.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantité (ex. 1 cuillère rase)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy === 'add'}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50 sm:col-span-2"
              >
                Ajouter au planning
              </button>
            </form>
          )}

          <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Semaine type</h4>
          <div className="mt-1 divide-y divide-slate-100">
            {WEEKDAYS.map((name, i) => {
              const dayItems = itemsForDay(items, i);
              return (
                <div key={name} className="py-2">
                  <p className={`text-sm font-semibold ${i === todayIndex ? 'text-teal-700' : 'text-slate-700'}`}>
                    {name}
                    {i === todayIndex && <span className="ml-2 text-xs font-normal text-teal-600">aujourd&apos;hui</span>}
                  </p>
                  {dayItems.length === 0 ? (
                    <p className="text-sm text-slate-400">Jeûne</p>
                  ) : (
                    <ul>{dayItems.map((it) => renderItem(it, false))}</ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
