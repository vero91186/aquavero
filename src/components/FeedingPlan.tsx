'use client';

import { useState } from 'react';
import { Moon, Plus, RefreshCw, Sunrise, Trash2, Utensils, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { FeedingPlanItem, FeedingSlot, Livestock, MaintenanceLog, Product, Tank } from '@/types/database';
import { productCategoryOf } from '@/lib/products';
import { buildFeedingPlan, defaultQuantity, describePopulation, feedingLogText, itemsForDay, mealLogs, quantitySuggestions, SLOT_LABELS, WEEKDAYS, weekdayOf } from '@/lib/feeding';

export function FeedingPlan({
  tank,
  items,
  logs,
  livestock,
  products,
  unavailable,
  onUpdated,
}: {
  tank: Tank;
  items: FeedingPlanItem[];
  logs: MaintenanceLog[];
  livestock: Livestock[];
  products: Product[];
  unavailable: boolean;
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [today] = useState(() => new Date());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(weekdayOf(new Date()));
  const [weekday, setWeekday] = useState(weekdayOf(new Date()));
  const [slot, setSlot] = useState<FeedingSlot>('evening');
  const [food, setFood] = useState('');
  const [quantity, setQuantity] = useState('');
  // Remplacement de l'aliment d'un repas déjà planifié.
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replFood, setReplFood] = useState('');
  const [replQuantity, setReplQuantity] = useState('');

  const foods = products.filter((p) => productCategoryOf(p) === 'food');
  const todayIndex = weekdayOf(today);
  // Dates réelles de la semaine en cours (lundi → dimanche) : le statut fait / pas fait se lit dessus.
  const weekDates = WEEKDAYS.map((_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayIndex + i, 12));
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPast = (d: Date) => d < startOfToday;
  const isFuture = (d: Date) => d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate() > today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
  const weekMeals = weekDates.flatMap((d, i) => (isFuture(d) ? [] : itemsForDay(items, i).map((it) => ({ it, d }))));
  const weekDone = weekMeals.filter(({ it, d }) => mealLogs(it, logs, d).length > 0).length;

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

  // Quand on choisit un aliment connu, la quantité habituelle est préremplie, sauf si
  // l'utilisateur a déjà tapé la sienne (on ne remplace qu'une quantité vide ou proposée).
  const nextQuantity = (previousFood: string, current: string, nextFood: string) => {
    const proposed = defaultQuantity(nextFood);
    if (!proposed) return current;
    return current.trim() === '' || quantitySuggestions(previousFood).includes(current) ? proposed : current;
  };

  function changeFood(value: string) {
    setQuantity((q) => nextQuantity(food, q, value));
    setFood(value);
  }

  function changeReplFood(value: string) {
    setReplQuantity((q) => nextQuantity(replFood, q, value));
    setReplFood(value);
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
    if (await insertItems(buildFeedingPlan(livestock, new Date(), foods))) onUpdated();
    setBusy(null);
  }

  // Remplace tout le planning par un nouveau calculé d'après le peuplement actuel.
  async function regenerate() {
    if (!window.confirm('Remplacer le planning actuel par un planning calculé d’après le peuplement ? Tes modifications manuelles seront perdues.')) return;
    setBusy('default');
    setError(null);
    const { error: err } = await supabase.from('feeding_plan_items').delete().eq('tank_id', tank.id);
    if (err) {
      setError(`Impossible de remplacer le planning : ${err.message}`);
      setBusy(null);
      return;
    }
    if (await insertItems(buildFeedingPlan(livestock, new Date(), foods))) onUpdated();
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

  function startReplace(item: FeedingPlanItem) {
    setReplacingId(item.id);
    setReplFood('');
    setReplQuantity('');
    setError(null);
  }

  // Remplace l'aliment (et la quantité) d'un repas du planning, sans toucher au jour ni au moment.
  // Les remarques de l'ancien aliment sont effacées : elles ne s'appliquent plus au nouveau.
  async function replaceItem(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!replFood.trim()) return;
    setBusy(id);
    setError(null);
    const { error: err } = await supabase
      .from('feeding_plan_items')
      .update({ food_name: replFood.trim(), quantity: replQuantity.trim() || null, notes: null })
      .eq('id', id);
    setBusy(null);
    if (err) {
      setError(`Impossible de remplacer : ${err.message}`);
      return;
    }
    setReplacingId(null);
    onUpdated();
  }

  // Cocher un repas l'ajoute au journal (type Alimentation) ; décocher retire cette entrée.
  async function toggleMeal(item: FeedingPlanItem, done: boolean, day: Date) {
    setBusy(item.id);
    setError(null);
    if (done) {
      const mine = mealLogs(item, logs, day);
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
          // Un repas d'un jour passé est daté de ce jour, pour que le journal et le planning s'alignent.
          performed_at: isPast(day) ? day.toISOString() : new Date().toISOString(),
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

  type DayStatus = 'none' | 'done' | 'missed' | 'todo';
  const dayStatus = (i: number): DayStatus => {
    const list = itemsForDay(items, i);
    if (list.length === 0) return 'none';
    const d = weekDates[i];
    const doneCount = list.filter((it) => mealLogs(it, logs, d).length > 0).length;
    if (doneCount === list.length) return 'done';
    return isPast(d) ? 'missed' : 'todo';
  };
  const DOT: Record<DayStatus, string> = {
    none: 'bg-slate-200',
    done: 'bg-emerald-500',
    missed: 'bg-red-400',
    todo: 'bg-teal-300',
  };
  const progress = weekMeals.length === 0 ? 0 : Math.round((weekDone / weekMeals.length) * 100);

  const renderItem = (it: FeedingPlanItem, day: Date) => {
    const done = mealLogs(it, logs, day).length > 0;
    const future = isFuture(day);
    const past = isPast(day);
    return (
      <li key={it.id} className={`rounded-xl border p-3 transition-colors ${done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            disabled={busy === it.id || (future && !done)}
            onChange={() => toggleMeal(it, done, day)}
            aria-label={`${it.food_name} : ${done ? 'donné' : 'à donner'}`}
            title={future ? 'Se coche le jour même' : undefined}
            className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-teal-600 disabled:cursor-default"
          />
          <div className="min-w-0 flex-1">
            <p className={`font-medium leading-snug ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{it.food_name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {it.quantity && <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">{it.quantity}</span>}
              {done ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Fait</span>
              ) : past ? (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Pas fait</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{future ? 'À venir' : 'À donner'}</span>
              )}
            </div>
            {it.notes && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{it.notes}</p>}
          </div>
          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => (replacingId === it.id ? setReplacingId(null) : startReplace(it))}
              disabled={busy === it.id}
              className="rounded-lg p-2 text-slate-400 hover:bg-teal-50 hover:text-teal-700"
              aria-label={`Remplacer ${it.food_name} par un autre aliment`}
              title="Remplacer par un autre aliment"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => removeItem(it.id)}
              disabled={busy === it.id}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Retirer ${it.food_name} du planning`}
              title="Retirer du planning"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {replacingId === it.id && (
          <form onSubmit={(e) => replaceItem(e, it.id)} className="mt-3 grid gap-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 sm:grid-cols-2">
            <input
              list="feeding-foods"
              value={replFood}
              onChange={(e) => changeReplFood(e.target.value)}
              placeholder="Nouvel aliment (ex. Shrimp Lollies)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              autoFocus
              required
            />
            <input
              list="feeding-quantities-repl"
              value={replQuantity}
              onChange={(e) => setReplQuantity(e.target.value)}
              placeholder="Quantité (ex. 1 bâtonnet)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={busy === it.id} className="rounded-lg bg-teal-600 px-3 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-50">
                Remplacer
              </button>
              <button type="button" onClick={() => setReplacingId(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </form>
        )}
      </li>
    );
  };

  const renderSlots = (list: FeedingPlanItem[], day: Date) =>
    (['morning', 'evening'] as FeedingSlot[]).map((s) => {
      const slotItems = list.filter((i) => i.slot === s);
      if (slotItems.length === 0) return null;
      const Icon = s === 'morning' ? Sunrise : Moon;
      return (
        <div key={s} className="mt-4 first:mt-0">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Icon size={14} className="text-teal-600" /> {SLOT_LABELS[s]}
          </p>
          <ul className="space-y-2">{slotItems.map((i) => renderItem(i, day))}</ul>
        </div>
      );
    });

  const selectedDate = weekDates[selectedDay];
  const selectedItems = itemsForDay(items, selectedDay);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xl text-slate-900">
          <Utensils size={19} className="text-teal-700" /> Planning de nourrissage
        </h3>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setWeekday(selectedDay);
              setAdding((v) => !v);
            }}
            className="flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm text-teal-800 hover:bg-teal-100"
          >
            <Plus size={14} /> Ajouter un repas
          </button>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <datalist id="feeding-foods">
        {foods.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <datalist id="feeding-quantities">
        {quantitySuggestions(food).map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>
      <datalist id="feeding-quantities-repl">
        {quantitySuggestions(replFood).map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>

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
            {describePopulation(livestock)
              ? `Calculé d’après le peuplement de ce bac (${describePopulation(livestock)}) : repas du matin pour la surface, repas coulant le soir pour le fond, jeûne le dimanche. Tu pourras tout modifier.`
              : 'Aucun animal dans l’onglet Peuplement : planning type (flocons le matin, paillettes ou pastilles le soir, jeûne le dimanche). Tu pourras tout modifier.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">
                {weekMeals.length === 0 ? 'Aucun repas à noter pour le moment' : `${weekDone} repas sur ${weekMeals.length} donnés cette semaine`}
              </span>
              {weekMeals.length > 0 && <span className="font-medium text-teal-700">{progress} %</span>}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5" role="tablist" aria-label="Jours de la semaine">
            {WEEKDAYS.map((name, i) => {
              const selected = i === selectedDay;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSelectedDay(i)}
                  className={`flex flex-col items-center rounded-xl border px-1 py-2 text-center transition-colors ${
                    selected ? 'border-teal-600 bg-teal-600 text-white' : i === todayIndex ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-medium">{name.slice(0, 3)}</span>
                  <span className="text-base font-semibold leading-tight">{weekDates[i].getDate()}</span>
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : DOT[dayStatus(i)]}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl bg-slate-50/70 p-3 sm:p-4">
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
              {WEEKDAYS[selectedDay]} {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              {selectedDay === todayIndex && <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-medium text-white">Aujourd&apos;hui</span>}
            </p>
            {selectedItems.length === 0 ? (
              <p className="py-3 text-center text-sm text-slate-500">Jour de jeûne : crevettes et escargots se nourrissent du biofilm et des algues.</p>
            ) : (
              renderSlots(selectedItems, selectedDate)
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
                onChange={(e) => changeFood(e.target.value)}
                placeholder="Aliment (ex. JBL ProNovo Bel Flakes S)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
              <input
                list="feeding-quantities"
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

          <button
            type="button"
            onClick={regenerate}
            disabled={busy === 'default'}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Wand2 size={14} /> Régénérer selon le peuplement
          </button>

          <details className="mt-4 text-sm text-slate-500">
            <summary className="cursor-pointer select-none text-slate-600">Conseils sur les quantités</summary>
            <p className="mt-2 leading-relaxed">
              Les quantités sont des repères : si de la nourriture reste le lendemain matin, réduis ; si tout disparaît en moins d&apos;une heure, augmente un peu. Retire les restes après quelques heures.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
