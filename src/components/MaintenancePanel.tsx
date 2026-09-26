'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceLog, MaintenanceTaskType, Tank } from '@/types/database';
import { CheckCircle2, Droplet } from 'lucide-react';

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water_change: "Changement d'eau",
  filter_clean: 'Nettoyage filtre',
  glass_clean: 'Nettoyage vitres',
  dosing: 'Dosage / engrais',
  feeding: 'Alimentation',
  equipment_check: 'Vérification matériel',
  other: 'Autre',
};

export function MaintenancePanel({ tank, tankId, logs, onUpdated }: {
  tank: Tank;
  tankId: string;
  logs: MaintenanceLog[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [taskType, setTaskType] = useState<MaintenanceTaskType>('water_change');
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState('');
  const [doseRatio, setDoseRatio] = useState(
    tank.conditioner_dose_ml_per_100l !== null ? String(tank.conditioner_dose_ml_per_100l) : ''
  );
  const [rememberDose, setRememberDose] = useState(false);
  const [saving, setSaving] = useState(false);

  const pct = parseFloat(percentage) || 0;
  const ratio = parseFloat(doseRatio) || 0;
  const litersChanged = tank.volume_liters * (pct / 100);
  const conditionerMl = ratio > 0 && pct > 0 ? (ratio * litersChanged) / 100 : null;

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
      percentage_changed: taskType === 'water_change' && percentage ? parseFloat(percentage) : null,
      conditioner_ml: taskType === 'water_change' && conditionerMl !== null ? Math.round(conditionerMl * 10) / 10 : null,
      performed_at: new Date().toISOString(),
    });

    if (taskType === 'water_change' && rememberDose && ratio > 0) {
      await supabase.from('tanks').update({ conditioner_dose_ml_per_100l: ratio }).eq('id', tankId);
    }

    setSaving(false);
    setDescription('');
    setPercentage('');
    setRememberDose(false);
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
            className={`rounded-lg border border-slate-300 px-2 py-1.5 text-sm ${taskType === 'water_change' ? 'sm:col-span-2' : 'sm:col-span-3'}`}
          />
        </div>

        {taskType === 'water_change' && (
          <div className="mt-4 rounded-xl bg-sky-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Droplet size={16} className="text-sky-600" />
              <p className="text-sm font-medium text-sky-800">Calculateur de conditionneur d&apos;eau</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Dosage produit (mL / 100 L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ex. 5"
                  value={doseRatio}
                  onChange={(e) => setDoseRatio(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Volume d&apos;eau neuve</p>
                <p className="rounded-lg bg-white px-2 py-1.5 text-sm text-slate-700">
                  {pct > 0 ? `${litersChanged.toFixed(1)} L` : '— renseigne le % changé'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Dose à ajouter</p>
                <p className="rounded-lg bg-white px-2 py-1.5 text-sm font-semibold text-sky-700">
                  {conditionerMl !== null ? `${conditionerMl.toFixed(1)} mL` : '—'}
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={rememberDose}
                onChange={(e) => setRememberDose(e.target.checked)}
                className="rounded border-slate-300"
              />
              Mémoriser ce dosage comme référence pour ce bac
            </label>
          </div>
        )}

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
                {log.conditioner_ml && <span className="text-slate-500"> — {log.conditioner_ml} mL de conditionneur</span>}
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
