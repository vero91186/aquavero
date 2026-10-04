import type { TreatmentProgram } from '@/types/database';

const DAY = 86400000;

// Dates au format AAAA-MM-JJ en heure locale (pas d'UTC : une dose « du 4 »
// doit rester celle du 4 quel que soit le fuseau).
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, n: number): string {
  return dateKey(new Date(parseKey(key).getTime() + n * DAY));
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / DAY);
}

// Jours de dose : du début à la fin incluse, tous les `every` jours.
export function scheduleDates(start: string, end: string, every: number): string[] {
  if (end < start) return [];
  const step = Math.max(1, Math.floor(every));
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 400; d = addDays(d, step)) out.push(d);
  return out;
}

export type ProgramPhase = 'upcoming' | 'running' | 'finished';

export interface ProgramState {
  dates: string[];
  done: Set<string>;
  doneCount: number;
  phase: ProgramPhase;
  dayIndex: number; // jour courant du programme (1 = premier jour), 0 si pas commencé
  totalDays: number;
  dueToday: boolean;
  overdue: string[]; // doses passées non faites
  next: string | null; // prochaine dose non faite à partir d'aujourd'hui
}

export function programState(p: TreatmentProgram, today: string): ProgramState {
  const dates = scheduleDates(p.start_date, p.end_date, p.every_days);
  const done = new Set(p.done_dates ?? []);
  const totalDays = diffDays(p.start_date, p.end_date) + 1;
  const phase: ProgramPhase = today < p.start_date ? 'upcoming' : today > p.end_date ? 'finished' : 'running';
  return {
    dates,
    done,
    doneCount: dates.filter((d) => done.has(d)).length,
    phase,
    dayIndex: phase === 'upcoming' ? 0 : Math.min(totalDays, diffDays(p.start_date, today) + 1),
    totalDays,
    dueToday: dates.includes(today) && !done.has(today),
    overdue: dates.filter((d) => d < today && !done.has(d)),
    next: dates.find((d) => d >= today && !done.has(d)) ?? null,
  };
}
