'use client';

import type { HealthScoreResult } from '@/lib/health-score';

const LABEL_COLORS: Record<HealthScoreResult['label'], string> = {
  excellent: 'bg-emerald-100 text-emerald-700',
  bon: 'bg-teal-100 text-teal-700',
  'à surveiller': 'bg-amber-100 text-amber-700',
  préoccupant: 'bg-red-100 text-red-700',
};

export function HealthScoreCard({ health }: { health: HealthScoreResult }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Score de santé du bac</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${LABEL_COLORS[health.label]}`}>
          {health.label}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-bold text-slate-900">{health.score}</span>
        <span className="mb-1 text-sm text-slate-400">/100</span>
      </div>
      {health.factors.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {health.factors.map((factor, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{factor.label}</span>
              <span className={factor.impact < 0 ? 'text-red-500' : 'text-slate-400'}>
                {factor.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
