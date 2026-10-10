import type { Livestock } from '@/types/database';
import { linesFromLivestock } from '@/lib/density';
import { introductionPlan } from '@/lib/introduction';
import { addDays, startOfDay } from '@/lib/maintenance-plan';

export interface ProposedDate {
  id: string;
  step: number;
  stepTitle: string;
  date: Date;
}

export function toIsoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Dates d'introduction raisonnables pour les animaux pas encore au bac, calées sur
// les quatre étapes de lib/introduction.ts (robustes d'abord, sensibles en dernier).
// Jour 0 = première introduction déjà faite, sinon aujourd'hui. Une étape ne commence
// jamais moins de 10 jours après la fin de la précédente (la filtration suit), et
// plusieurs espèces d'une même étape sont espacées d'au moins 3 jours.
export function proposeIntroDates(
  animals: Livestock[],
  plannedIds: Set<string>,
  today: Date = new Date()
): { day0: Date; hasIntroduced: boolean; dates: ProposedDate[] } {
  const t = startOfDay(today);
  const todayIso = toIsoDay(t);
  const introduced = animals.filter(
    (l) => !plannedIds.has(l.id) && l.added_at && l.added_at <= todayIso
  );
  const hasIntroduced = introduced.length > 0;
  const day0 = hasIntroduced
    ? new Date(`${introduced.map((l) => l.added_at as string).sort()[0]}T12:00:00`)
    : t;

  const planned = animals.filter((l) => plannedIds.has(l.id));
  const steps = introductionPlan(linesFromLivestock(planned));
  const earliest = hasIntroduced ? addDays(t, 1) : t;

  const dates: ProposedDate[] = [];
  let previousEnd: Date | null = null;
  for (const s of steps) {
    let start = addDays(day0, s.startDay);
    if (start < earliest) start = earliest;
    if (previousEnd) {
      const minStart = addDays(previousEnd, 10);
      if (start < minStart) start = minStart;
    }
    const width = s.endDay - s.startDay;
    const n = s.lines.length;
    const gap = n > 1 ? Math.max(3, Math.floor(width / (n - 1))) : 0;
    const ordered = [...s.lines].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    ordered.forEach((l, i) => {
      dates.push({ id: l.id, step: s.step, stepTitle: s.title, date: addDays(start, i * gap) });
    });
    previousEnd = addDays(start, Math.max(0, (n - 1) * gap));
  }
  return { day0, hasIntroduced, dates };
}
