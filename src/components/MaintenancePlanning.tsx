'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, Droplets, Eraser, Filter, Fish, FlaskConical, Gauge, Leaf, ListChecks, Utensils, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock, MaintenanceLog, MaintenanceTaskType, Product, WaterTest } from '@/types/database';
import { productCategoryOf } from '@/lib/products';
import { addDays, buildPlan, contextFromLivestock, type PlanConditioner, dayNumber, firstIntroduction, PLAN_KEYWORDS, startOfDay, type PlanItem } from '@/lib/maintenance-plan';
import { introductionPlan } from '@/lib/introduction';
import { linesFromLivestock } from '@/lib/density';

const HORIZON_DAYS = 42;
const LATE_WINDOW_DAYS = 14;

function mondayOf(d: Date): Date {
  const r = startOfDay(d);
  const dow = (r.getDay() + 6) % 7;
  return addDays(r, -dow);
}

const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// « Aujourd'hui », « demain », « dans 3 jours » : plus parlant qu'une date seule.
function relativeLabel(d: Date, today: Date): string {
  const n = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return 'Demain';
  if (n === -1) return 'Hier';
  if (n < 0) return `Il y a ${-n} jours`;
  return `Dans ${n} jours`;
}

// Mot-clé de la tâche présent dans un texte (description du journal), s'il y en a un.
const keywordIn = (text: string) => PLAN_KEYWORDS.find((k) => text.toLowerCase().includes(k)) ?? null;

// Interventions du journal qui correspondent à une tâche du planning.
function matchingLogs(item: PlanItem, logs: MaintenanceLog[]) {
  if (item.type === 'test') return [];
  return logs.filter(
    (l) =>
      l.task_type === item.type &&
      // Des tâches de même type (catappa, pastilles, engrais liquide : « dosage ») se distinguent par la description du journal.
      (keywordIn(l.description ?? '') ?? null) === (item.keyword ?? null) &&
      Math.abs(new Date(l.performed_at).getTime() - item.date.getTime()) <= (item.tolerance + 0.5) * 86400000
  );
}

// Un test est fait dès qu'une mesure est saisie dans l'onglet Tests, à un jour près.
function testDone(item: PlanItem, tests: WaterTest[]) {
  return tests.some((x) => Math.abs(new Date(x.tested_at).getTime() - item.date.getTime()) <= 1.5 * 86400000);
}

function isDone(item: PlanItem, logs: MaintenanceLog[], tests: WaterTest[]) {
  return item.type === 'test' ? testDone(item, tests) : matchingLogs(item, logs).length > 0;
}

// Icône et couleur par famille de tâche, pour se repérer sans lire.
function kindOf(it: PlanItem): { icon: React.ReactNode; label: string; tone: string } {
  if (it.type === 'water_change') return { icon: <Droplets size={16} />, label: 'Eau', tone: 'bg-sky-50 text-sky-700' };
  if (it.type === 'test') return { icon: <Gauge size={16} />, label: 'Test', tone: 'bg-violet-50 text-violet-700' };
  if (it.type === 'dosing') {
    if (it.keyword === 'catappa') return { icon: <Leaf size={16} />, label: 'Catappa', tone: 'bg-amber-50 text-amber-700' };
    return { icon: <FlaskConical size={16} />, label: 'Engrais', tone: 'bg-emerald-50 text-emerald-700' };
  }
  if (it.type === 'glass_clean') return { icon: <Eraser size={16} />, label: 'Vitres', tone: 'bg-slate-100 text-slate-700' };
  if (it.type === 'observation') return { icon: <Fish size={16} />, label: 'Animaux', tone: 'bg-cyan-50 text-cyan-700' };
  if (it.type === 'feeding') return { icon: <Utensils size={16} />, label: 'Repas', tone: 'bg-rose-50 text-rose-700' };
  if (it.type === 'filter_clean') return { icon: <Filter size={16} />, label: 'Filtre', tone: 'bg-orange-50 text-orange-700' };
  if (it.type === 'equipment_check') return { icon: <Wrench size={16} />, label: 'Matériel', tone: 'bg-slate-100 text-slate-700' };
  return { icon: <Leaf size={16} />, label: 'Plantes', tone: 'bg-lime-50 text-lime-700' };
}

export function MaintenancePlanning({ tankId, livestock, logs, tests, volumeLiters, maintenanceWeekday, waterEveryWeeks, conditionerDosePer100l, products, onUpdated, onNote }: {
  tankId: string;
  livestock: Livestock[];
  logs: MaintenanceLog[];
  tests: WaterTest[];
  volumeLiters: number;
  // Jour d'entretien choisi (0 = lundi … 6 = dimanche), null = calé sur le jour 0.
  maintenanceWeekday: number | null;
  // Changement d'eau toutes les 1 ou 2 semaines.
  waterEveryWeeks: number;
  // Dose de référence du conditionneur (mL pour 100 L d'eau neuve) et fiches produits du bac.
  conditionerDosePer100l: number | null;
  products: Product[];
  // Recharge les données après qu'une case a été cochée ou décochée.
  onUpdated: () => void;
  // Préremplit le formulaire de journal plus bas avec le type de tâche choisi.
  onNote: (t: MaintenanceTaskType) => void;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const day0 = firstIntroduction(livestock, today);

  if (!day0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <CalendarDays size={18} /> Planning d&apos;entretien
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Le planning se cale sur la date d&apos;introduction de tes premiers animaux : ajoute-en un dans l&apos;onglet Vivant avec sa date (une date à venir compte comme prévue, pas comme introduite).
        </p>
      </div>
    );
  }

  // Dose enregistrée sur le bac en priorité, sinon celle de la fiche du conditionneur (anti-chlore) du bac.
  const conditionerProduct = products.find((p) => productCategoryOf(p) === 'conditioner' && (p.dose_ml_per_100l ?? 0) > 0);
  const conditioner: PlanConditioner | null =
    (conditionerDosePer100l ?? 0) > 0
      ? { name: conditionerProduct?.name ?? null, per100l: conditionerDosePer100l as number }
      : conditionerProduct
        ? { name: conditionerProduct.name, per100l: conditionerProduct.dose_ml_per_100l as number }
        : null;
  const items = buildPlan(day0, addDays(today, -LATE_WINDOW_DAYS), addDays(today, HORIZON_DAYS), volumeLiters, contextFromLivestock(livestock), maintenanceWeekday, waterEveryWeeks, conditioner);
  const late = items.filter((i) => i.date < today && i.type !== 'test' && !isDone(i, logs, tests));
  const upcoming = items.filter((i) => i.date >= today);

  const weeks = new Map<number, PlanItem[]>();
  for (const it of upcoming) {
    const key = mondayOf(it.date).getTime();
    weeks.set(key, [...(weeks.get(key) ?? []), it]);
  }
  const thisMonday = mondayOf(today).getTime();
  const n = dayNumber(day0, today);
  const addedAtOf = new Map(livestock.map((l) => [l.id, l.added_at]));
  const introSteps = introductionPlan(linesFromLivestock(livestock)).map((s) => {
    const from = addDays(day0, s.startDay);
    const to = addDays(day0, s.endDay);
    const lines = s.lines.map((l) => {
      const at = addedAtOf.get(l.id);
      const done = !!at && new Date(`${at}T12:00:00`) <= today;
      return { l, at, done };
    });
    return { s, from, to, lines, allDone: lines.every((x) => x.done) };
  });

  async function updateTank(patch: { maintenance_weekday?: number | null; water_change_every_weeks?: number }) {
    setError(null);
    const { error: err } = await supabase.from('tanks').update(patch).eq('id', tankId);
    if (err) setError(`Impossible de modifier le réglage : ${err.message}`);
    onUpdated();
  }
  const changeWeekday = (value: string) => updateTank({ maintenance_weekday: value === '' ? null : Number(value) });

  // Cocher ajoute l'intervention au journal ; décocher retire celle que la case avait créée.
  async function toggle(it: PlanItem, key: string, done: boolean) {
    setError(null);
    setBusyKey(key);
    if (done) {
      const mine = matchingLogs(it, logs).filter((l) => l.description === it.title);
      if (mine.length > 0) {
        const { error: err } = await supabase.from('maintenance_logs').delete().in('id', mine.map((l) => l.id));
        if (err) setError(`Impossible de décocher : ${err.message}`);
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setBusyKey(null);
        return;
      }
      // Une tâche en retard est datée du jour prévu, pour que le journal et le planning s'alignent.
      const when = it.date < today ? it.date : new Date();
      const { error: err } = await supabase.from('maintenance_logs').insert({
        tank_id: tankId,
        user_id: userData.user.id,
        task_type: it.type,
        description: it.title,
        // Changement d'eau : on note aussi l'eau changée et le conditionneur versé.
        ...(it.type === 'water_change' ? { percentage_changed: it.percentage ?? null, conditioner_ml: it.conditionerMl ?? null } : {}),
        performed_at: when.toISOString(),
      });
      if (err) setError(`Impossible de cocher : ${err.message}`);
    }
    setBusyKey(null);
    onUpdated();
  }

  const renderItem = (it: PlanItem, overdue = false) => {
    const noteType = it.type === 'test' ? null : (it.type as MaintenanceTaskType);
    const done = !overdue && isDone(it, logs, tests);
    const isTest = it.type === 'test';
    const ownLog = !isTest && matchingLogs(it, logs).some((l) => l.description === it.title);
    const key = `${it.type}-${it.title}-${it.date.getTime()}`;
    const open = openKey === key;
    const kind = kindOf(it);
    return (
      <li key={key} className="py-2.5">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            disabled={isTest || busyKey === key || (done && !ownLog)}
            onChange={() => toggle(it, key, done)}
            aria-label={`${it.title} : ${done ? 'fait' : 'à faire'}`}
            title={isTest ? 'Se coche tout seul dès qu’un test est saisi dans l’onglet Tests' : done && !ownLog ? 'Noté dans le journal : supprime-le depuis le journal pour décocher' : undefined}
            className="mt-1.5 h-5 w-5 shrink-0 cursor-pointer accent-teal-600 disabled:cursor-default"
          />
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-slate-100 text-slate-400' : kind.tone}`} title={kind.label}>
            {kind.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
              {it.title}
              {done ? (
                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-normal text-emerald-700">Fait</span>
              ) : it.date < today ? (
                <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-normal text-red-700">Pas fait</span>
              ) : it.date.getTime() === today.getTime() ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">À faire</span>
              ) : (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">À venir</span>
              )}
            </p>
            <p className="text-sm text-slate-600">{it.summary}</p>
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : key)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
              aria-expanded={open}
            >
              <ChevronDown size={12} className={open ? 'rotate-180' : ''} /> {open ? 'Masquer les détails' : 'Voir les détails'}
            </button>
            {open && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{it.detail}</p>}
          </div>
          {noteType && !done && (
            <button
              type="button"
              onClick={() => onNote(noteType)}
              className="shrink-0 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-800 hover:bg-teal-100"
              title={it.keyword ? `Écris « ${it.keyword} » dans la description pour que la tâche soit cochée` : undefined}
            >
              Noter
            </button>
          )}
        </div>
      </li>
    );
  };

  // Les tâches d'un même jour sont regroupées sous une seule date.
  const renderDays = (list: PlanItem[]) => {
    const byDay = new Map<number, PlanItem[]>();
    for (const it of list) byDay.set(it.date.getTime(), [...(byDay.get(it.date.getTime()) ?? []), it]);
    return [...byDay.entries()].map(([t, dayItems]) => {
      const d = new Date(t);
      return (
        <div key={t} className="py-1">
          <p className="text-xs font-semibold text-slate-700">
            {relativeLabel(d, today)} <span className="font-normal text-slate-400">· {fmtLong(d)}</span>
          </p>
          <ul className="divide-y divide-slate-100">{dayItems.map((i) => renderItem(i))}</ul>
        </div>
      );
    });
  };

  const todayItems = upcoming.filter((i) => i.date.getTime() === today.getTime());
  const todo = todayItems.filter((i) => !isDone(i, logs, tests));

  // Bilan de la semaine en cours : tâches prévues du lundi à aujourd'hui (les tests se cochent tout seuls, ils ne comptent pas).
  const weekStart = mondayOf(today).getTime();
  const weekSoFar = items.filter((i) => i.type !== 'test' && i.date.getTime() >= weekStart && i.date.getTime() <= today.getTime());
  const weekDone = weekSoFar.filter((i) => isDone(i, logs, tests)).length;
  // Tâches passées de cette semaine déjà faites : elles restent visibles, et décochables.
  const doneWeek = items.filter((i) => i.date.getTime() >= weekStart && i.date < today && isDone(i, logs, tests));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <CalendarDays size={18} /> Planning d&apos;entretien
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Jour {n} depuis l&apos;arrivée des premiers animaux (le {day0.toLocaleDateString('fr-FR')}). Repas : voir l’onglet Nourrissage (petites quantités, rien ne doit rester après 2 minutes pour les poissons, jeûne un jour par semaine).
      </p>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
        Jour du changement d&apos;eau
        <select
          value={maintenanceWeekday ?? ''}
          onChange={(e) => changeWeekday(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
        >
          <option value="">Automatique (jour {day0.toLocaleDateString('fr-FR', { weekday: 'long' })})</option>
          {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((d, i) => (
            <option key={d} value={i}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
        Fréquence du changement d&apos;eau
        <select
          value={waterEveryWeeks}
          onChange={(e) => updateTank({ water_change_every_weeks: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
        >
          <option value={1}>Toutes les semaines</option>
          <option value={2}>Toutes les 2 semaines</option>
        </select>
      </label>

      <div className={`mt-3 rounded-xl border px-3 py-2 ${todo.length > 0 ? 'border-teal-200 bg-teal-50/50' : 'border-slate-100 bg-slate-50'}`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ListChecks size={16} />{' '}
          {todayItems.length === 0
            ? "Rien de prévu aujourd'hui"
            : todo.length === 0
              ? "Tout est fait pour aujourd'hui"
              : `À faire aujourd'hui (${todo.length})`}
        </p>
        {todayItems.length > 0 && <ul className="divide-y divide-teal-100">{todayItems.map((i) => renderItem(i))}</ul>}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <p className="mt-3 text-sm text-slate-600">
        {weekSoFar.length === 0
          ? 'Aucune tâche à noter cette semaine pour le moment.'
          : `Cette semaine : ${weekDone} tâche${weekDone > 1 ? 's' : ''} faite${weekDone > 1 ? 's' : ''} sur ${weekSoFar.length} prévue${weekSoFar.length > 1 ? 's' : ''} jusqu'à aujourd'hui.`}
      </p>

      {late.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50/40 px-3 py-2">
          <p className="text-sm font-semibold text-red-700">Pas fait ({late.length})</p>
          <ul className="divide-y divide-red-100">{late.map((i) => renderItem(i, true))}</ul>
        </div>
      )}

      {doneWeek.length > 0 && (
        <details className="group mt-3 rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-emerald-700">
            <ChevronDown size={14} className="transition group-open:rotate-180" /> Déjà fait cette semaine ({doneWeek.length})
          </summary>
          <div className="mt-1">{renderDays(doneWeek)}</div>
        </details>
      )}

      <div className="mt-3 space-y-4">
        {[...weeks.entries()].map(([monday, list]) => {
          const rest = list.filter((i) => i.date.getTime() !== today.getTime());
          if (rest.length === 0) return null;
          return (
            <div key={monday}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {monday === thisMonday
                  ? 'Le reste de la semaine'
                  : monday === thisMonday + 7 * 86400000
                    ? 'Semaine prochaine'
                    : `Semaine du ${new Date(monday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
              </h4>
              <div>{renderDays(rest)}</div>
            </div>
          );
        })}
        {upcoming.filter((i) => i.date.getTime() !== today.getTime()).length === 0 && <p className="text-sm text-slate-400">Rien de prévu sur les six prochaines semaines.</p>}
      </div>

      {introSteps.length > 0 && (
        <details className="group mt-5 border-t border-slate-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600">
            <ChevronDown size={14} className="transition group-open:rotate-180" /> Introductions des espèces ({introSteps.length} étape{introSteps.length > 1 ? 's' : ''})
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            Ajoute les espèces à venir dans l&apos;onglet Vivant avec leur date prévue : elles s&apos;alignent ici sur les fenêtres conseillées. Avant chaque étape, NO2 à 0 et NO3 sous 25 aux deux derniers tests.
          </p>
          <ul className="mt-2 space-y-2">
            {introSteps.map(({ s, from, to, lines, allDone }) => (
              <li key={s.step} className="rounded-lg border border-slate-100 px-3 py-2">
                <p className={`text-sm font-medium ${allDone ? 'text-slate-400' : 'text-slate-800'}`}>
                  Étape {s.step} · {s.title}
                  {allDone && <span className="ml-2 text-xs font-normal text-emerald-600">faite</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {s.endDay === s.startDay
                    ? `Jour 0, le ${fmtDay(from)}`
                    : `Du ${fmtDay(from)} au ${fmtDay(to)}`}
                </p>
                <ul className="mt-1 text-xs text-slate-600">
                  {lines.map(({ l, at, done }) => {
                    const at12 = at ? new Date(`${at}T12:00:00`) : null;
                    const outside = !done && at12 && (at12 < from || at12 > to);
                    return (
                      <li key={l.id}>
                        {l.quantity}× {l.name}
                        {done && at12 ? ` · introduit le ${fmtDay(at12)}` : at12 ? ` · prévu le ${fmtDay(at12)}` : ' · date à fixer'}
                        {outside && <span className="ml-1 text-amber-700">(hors de la fenêtre conseillée)</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
