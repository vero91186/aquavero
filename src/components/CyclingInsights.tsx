'use client';

import type { CyclingDose, Tank, WaterTest } from '@/types/database';
import {
  CYCLE_PHASES,
  CYCLE_TYPICAL_DAYS,
  cycleCriteria,
  daysSince,
  nextActions,
  readParams,
  sortedTests,
  type ParamLevel,
  type ParamReading,
} from '@/lib/cycling';
import { ArrowDownRight, ArrowUpRight, Minus, CheckCircle2, Circle, HelpCircle, AlertTriangle, Info, PartyPopper } from 'lucide-react';

const LEVEL_COLOR: Record<ParamLevel, string> = {
  ok: '#3b8056',
  progress: '#e0a23a',
  high: '#c2410c',
  unknown: '#b6c5be',
};

const LEVEL_TEXT: Record<ParamLevel, string> = {
  ok: 'dans la cible',
  progress: 'en cours',
  high: 'trop élevé',
  unknown: 'pas de valeur',
};

export function CyclingInsights({ tank, tests, doses }: { tank: Tank; tests: WaterTest[]; doses: CyclingDose[] }) {
  const days = daysSince(tank.setup_date);
  const params = readParams(tests);
  const criteria = cycleCriteria(tests, doses);
  const actions = nextActions(tank, tests, doses);
  const latest = sortedTests(tests)[0];
  const doneCount = criteria.filter((c) => c.state === 'done').length;

  return (
    <div className="space-y-6">
      <Timeline days={days} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h3 className="text-xl text-slate-900">Où en sont les paramètres</h3>
          {latest && (
            <span className="text-xs text-slate-400">
              test du {new Date(latest.tested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {params.map((p) => (
            <Gauge key={p.key} p={p} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-xl text-slate-900">Le rodage est-il fini ?</h3>
          <span className="text-sm font-medium text-teal-700">
            {doneCount} sur {criteria.length}
          </span>
        </div>
        <ul className="space-y-2">
          {criteria.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              {c.state === 'done' ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-teal-600" />
              ) : c.state === 'todo' ? (
                <Circle size={20} className="mt-0.5 shrink-0 text-amber-500" />
              ) : (
                <HelpCircle size={20} className="mt-0.5 shrink-0 text-slate-300" />
              )}
              <div>
                <p className={`text-sm font-medium ${c.state === 'done' ? 'text-slate-900' : 'text-slate-700'}`}>{c.label}</p>
                <p className="text-xs text-slate-500">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl text-slate-900">Ce qu’il faut faire maintenant</h3>
        {actions.map((a, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
              a.tone === 'alert'
                ? 'border-red-200 bg-red-50 text-red-800'
                : a.tone === 'success'
                  ? 'border-teal-200 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {a.tone === 'alert' ? (
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            ) : a.tone === 'success' ? (
              <PartyPopper size={18} className="mt-0.5 shrink-0" />
            ) : (
              <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />
            )}
            <p>{a.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Timeline({ days }: { days: number | null }) {
  const span = Math.max(CYCLE_TYPICAL_DAYS, (days ?? 0) + 3);
  const pct = (d: number) => `${(d / span) * 100}%`;
  const position = days === null ? null : Math.min(days, span);

  return (
    <section className="rounded-2xl bg-abysse p-5 text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl">Calendrier du rodage</h3>
        <p className="text-sm text-teal-200">
          {days === null
            ? 'Renseigne la date de mise en eau pour placer le bac sur la frise'
            : days > CYCLE_TYPICAL_DAYS
              ? `Jour ${days}, au-delà des 6 semaines habituelles`
              : `Jour ${days} sur environ ${CYCLE_TYPICAL_DAYS}`}
        </p>
      </div>

      <div className="relative mt-8 mb-2 h-4">
        {CYCLE_PHASES.map((ph) => (
          <div
            key={ph.key}
            className="absolute top-0 h-4 first:rounded-l-full last:rounded-r-full"
            style={{ left: pct(ph.from), width: `calc(${pct(ph.to - ph.from)} - 2px)`, background: ph.color }}
            title={`${ph.label}, jours ${ph.from} à ${ph.to}`}
          />
        ))}
        {position !== null && (
          <div className="absolute -top-6 -bottom-1 w-0.5 bg-sable" style={{ left: pct(position) }}>
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-sable px-2 py-0.5 text-xs font-semibold text-abysse">
              jour {days}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-9 text-xs text-teal-100">
        {CYCLE_PHASES.map((ph) => (
          <div key={ph.key} className="absolute" style={{ left: pct(ph.from), width: pct(ph.to - ph.from) }}>
            <p className="font-medium text-white">{ph.label}</p>
            <p className="text-teal-300">
              j{ph.from} à j{ph.to}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-teal-300">
        Repères habituels d’un rodage sans poisson. Les vraies étapes se lisent sur tes tests, pas sur le calendrier.
      </p>
    </section>
  );
}

function Gauge({ p }: { p: ParamReading }) {
  const color = LEVEL_COLOR[p.level];
  const fill = p.value === null ? 0 : Math.min(100, (p.value / p.max) * 100);
  const Trend = p.trend === 'down' ? ArrowDownRight : p.trend === 'up' ? ArrowUpRight : Minus;
  const trendLabel = p.trend === 'down' ? 'en baisse' : p.trend === 'up' ? 'en hausse' : p.trend === 'flat' ? 'stable' : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{p.label}</span>
        {trendLabel && (
          <span className="flex items-center gap-0.5 text-xs text-slate-500">
            <Trend size={14} /> {trendLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight" style={{ color }}>
        {p.value ?? '–'}
        <span className="ml-1 text-sm font-medium text-slate-400">ppm</span>
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${fill}%`, background: color }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {LEVEL_TEXT[p.level]}, {p.caption}
      </p>
    </div>
  );
}
