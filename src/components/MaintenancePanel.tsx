'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceLog, MaintenanceTaskType, Tank } from '@/types/database';
import { CheckCircle2, Droplet, Pencil, Trash2, Check, X } from 'lucide-react';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water_change: "Changement d'eau",
  filter_clean: 'Nettoyage filtre',
  glass_clean: 'Nettoyage vitres',
  dosing: 'Dosage / engrais',
  feeding: 'Alimentation',
  equipment_check: 'Vérification matériel',
  other: 'Autre',
};

export function MaintenancePanel({ tank, tankId, logs, onUpdated, presetTaskType }: {
  tank: Tank;
  tankId: string;
  logs: MaintenanceLog[];
  onUpdated: () => void;
  // Préremplit le type d'intervention (ex. depuis les boutons rapides de
  // l'onglet Aperçu) sans forcer un composant contrôlé de l'extérieur.
  presetTaskType?: MaintenanceTaskType | null;
}) {
  const supabase = createClient();
  const [taskType, setTaskType] = useState<MaintenanceTaskType>(presetTaskType ?? 'water_change');

  useEffect(() => {
    // Synchronise avec les boutons rapides de l'onglet Aperçu : un choix
    // externe doit se refléter dans le sélecteur du formulaire.
    if (presetTaskType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskType(presetTaskType);
    }
  }, [presetTaskType]);
  const [description, setDescription] = useState('');
  const [percentage, setPercentage] = useState('');
  const [doseRatio, setDoseRatio] = useState(
    tank.conditioner_dose_ml_per_100l !== null ? String(tank.conditioner_dose_ml_per_100l) : ''
  );
  const [rememberDose, setRememberDose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    performed_at: string;
    task_type: MaintenanceTaskType;
    percentage_changed: string;
    conditioner_ml: string;
    description: string;
  }>({ performed_at: '', task_type: 'water_change', percentage_changed: '', conditioner_ml: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

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

  async function handleDeleteLog(id: string) {
    await supabase.from('maintenance_logs').delete().eq('id', id);
    onUpdated();
  }

  function startEditLog(log: MaintenanceLog) {
    setEditingId(log.id);
    setEditForm({
      performed_at: toDatetimeLocal(log.performed_at),
      task_type: log.task_type,
      percentage_changed: log.percentage_changed !== null ? String(log.percentage_changed) : '',
      conditioner_ml: log.conditioner_ml !== null ? String(log.conditioner_ml) : '',
      description: log.description ?? '',
    });
  }

  function cancelEditLog() {
    setEditingId(null);
  }

  async function saveEditLog(id: string) {
    setSavingEdit(true);
    await supabase
      .from('maintenance_logs')
      .update({
        performed_at: new Date(editForm.performed_at).toISOString(),
        task_type: editForm.task_type,
        percentage_changed:
          editForm.task_type === 'water_change' && editForm.percentage_changed
            ? parseFloat(editForm.percentage_changed)
            : null,
        conditioner_ml:
          editForm.task_type === 'water_change' && editForm.conditioner_ml
            ? parseFloat(editForm.conditioner_ml)
            : null,
        description: editForm.description || null,
      })
      .eq('id', id);
    setSavingEdit(false);
    setEditingId(null);
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
          {logs.map((log) =>
            editingId === log.id ? (
              <div key={log.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Type</label>
                  <select
                    value={editForm.task_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, task_type: e.target.value as MaintenanceTaskType }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {Object.entries(TASK_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  <input
                    type="datetime-local"
                    value={editForm.performed_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, performed_at: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                {editForm.task_type === 'water_change' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">% changé</label>
                      <input
                        type="number"
                        value={editForm.percentage_changed}
                        onChange={(e) => setEditForm((f) => ({ ...f, percentage_changed: e.target.value }))}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Conditionneur (mL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.conditioner_ml}
                        onChange={(e) => setEditForm((f) => ({ ...f, conditioner_ml: e.target.value }))}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                  </>
                )}
                <div className="min-w-[8rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Note</label>
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEditLog(log.id)}
                    disabled={savingEdit}
                    className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    title="Enregistrer"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEditLog} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Annuler">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={log.id} className="flex items-start justify-between gap-2 border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0">
                <div className="flex items-start gap-2">
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
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEditLog(log)} className="text-slate-400 hover:text-teal-600" title="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
          {logs.length === 0 && <p className="text-sm text-slate-400">Aucune intervention enregistrée</p>}
        </div>
      </div>
    </div>
  );
}
