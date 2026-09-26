'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceLog, MaintenanceTaskType } from '@/types/database';
import { CheckCircle2 } from 'lucide-react';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water_change: "Changement d'eau",
  filter_clean: 'Nettoyage filtre',
  glass_clean: 'Nettoyage vitres',
  dosing: 'Dosage / engrais',
  feeding: 'Alimentation',
  equipment_check: 'Vérification matériel',
  other: 'Autre',
};

export function MaintenancePanel({ tankId, logs, onUpdated }: {
  tankId: string;
  logs: MaintenanceLog[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [taskType, setTaskType] = useState<MaintenanceTaskType>('water_change');
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('maintenance_logs').insert({
      tank_id: tankId,
      user_id: user.id,
      task_type: taskType,
      description: description || null,
      percentage_changed: percentage ? parseFloat(percentage) : null,
      performed_at: new Date().toISOString(),
    });
    setSaving(false);
    setDescription('');
    setPercentage('');
    onUpdated();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Noter une intervention</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as MaintenanceTaskType)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(TASK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {taskType === 'water_change' && (
            <input
              type="number"
              placeholder="% changé"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
          <input
            placeholder="Note (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Journal</h3>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-500" />
              <div>
                <span className="font-medium text-slate-800">{TASK_LABELS[log.task_type]}</span>
                {log.percentage_changed && <span className="text-slate-500"> — {log.percentage_changed}%</span>}
                {log.description && <span className="text-slate-500"> — {log.description}</span>}
                <div className="text-xs text-slate-400">
                  {new Date(log.performed_at).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-slate-400">Aucune intervention enregistrée</p>}
        </div>
      </div>
    </div>
  );
}
