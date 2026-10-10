'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { Livestock, MaintenanceLog, MaintenanceTaskType } from '@/types/database';
import { addDays, buildPlan, dayNumber, firstIntroduction, startOfDay, type PlanItem } from '@/lib/maintenance-plan';

const HORIZON_DAYS = 42;
const LATE_WINDOW_DAYS = 14;

function mondayOf(d: Date): Date {
  const r = startOfDay(d);
  const dow = (r.getDay() + 6) % 7;
  return addDays(r, -dow);
}

const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

function isDone(item: PlanItem, logs: MaintenanceLog[]) {
  if (item.type === 'test') return false;
  return logs.some(
    (l) =>
      l.task_type === item.type &&
      Math.abs(new Date(l.performed_at).getTime() - item.date.getTime()) <= (item.tolerance + 0.5) * 86400000
  );
}

export function MaintenancePlanning({ livestock, logs, onNote }: {
  livestock: Livestock[];
  logs: MaintenanceLog[];
  // Préremplit le formulaire de journal plus bas avec le type de tâche choisi.
  onNote: (t: MaintenanceTaskType) => void;
}) {
  const [today] = useState(() => startOfDay(new Date()));
  const day0 = firstIntroduction(livestock);

  if (!day0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <CalendarDays size={18} /> Planning d&apos;entretien
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Le planning se cale sur la date d&apos;introduction de tes premiers animaux : ajoute-en un dans l&apos;onglet Vivant avec sa date.
        </p>
      </div>
    );
  }

  const items = buildPlan(day0, addDays(today, -LATE_WINDOW_DAYS), addDays(today, HORIZON_DAYS));
  const late = items.filter((i) => i.date < today && i.type !== 'test' && !isDone(i, logs));
  const upcoming = items.filter((i) => i.date >= today);

  const weeks = new Map<number, PlanItem[]>();
  for (const it of upcoming) {
    const key = mondayOf(it.date).getTime();
    weeks.set(key, [...(weeks.get(key) ?? []), it]);
  }
  const thisMonday = mondayOf(today).getTime();
  const n = dayNumber(day0, today);

  const renderItem = (it: PlanItem, overdue = false) => {
    const noteType = it.type === 'test' ? null : (it.type as MaintenanceTaskType);
    const done = !overdue && isDone(it, logs);
    return (
      <li key={`${it.type}-${it.title}-${it.date.getTime()}`} className="flex items-start gap-3 py-2">
        <span className={`w-24 shrink-0 text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>{fmtDay(it.date)}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {it.title}
            {overdue && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-normal text-red-700">en retard</span>}
            {done && <span className="ml-2 text-xs font-normal text-emerald-600">fait</span>}
          </p>
          <p className="text-xs text-slate-500">{it.detail}</p>
        </div>
        {noteType && !done && (
          <button
            type="button"
            onClick={() => onNote(noteType)}
            className="shrink-0 rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-xs text-teal-800 hover:bg-teal-100"
          >
            Noter
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <CalendarDays size={18} /> Planning d&apos;entretien
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Jour {n} depuis l&apos;arrivée des premiers animaux (le {day0.toLocaleDateString('fr-FR')}), six prochaines semaines. Chaque jour : nourris une fois, en petite quantité, et jette ce qui reste après 2 minutes.
      </p>

      {late.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50/40 px-3">
          <ul className="divide-y divide-red-100">{late.map((i) => renderItem(i, true))}</ul>
        </div>
      )}

      <div className="mt-3 space-y-4">
        {[...weeks.entries()].map(([monday, list]) => (
          <div key={monday}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {monday === thisMonday ? 'Cette semaine' : `Semaine du ${new Date(monday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
            </h4>
            <ul className="divide-y divide-slate-100">{list.map((i) => renderItem(i))}</ul>
          </div>
        ))}
        {weeks.size === 0 && <p className="text-sm text-slate-400">Rien de prévu sur les six prochaines semaines.</p>}
      </div>
    </div>
  );
}
