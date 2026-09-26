'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { CyclingDose, CyclingStatus, Tank, WaterTest } from '@/types/database';
import { suggestCyclingStatus, daysSince } from '@/lib/cycling';
import { Droplets, FlaskConical, Trash2, Pencil, Check, X } from 'lucide-react';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABELS: Record<CyclingStatus, string> = {
  not_started: 'Pas encore démarré',
  cycling: 'Cyclage en cours',
  cycled: 'Cycle terminé',
};

const STATUS_STYLES: Record<CyclingStatus, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  cycling: 'bg-amber-100 text-amber-700',
  cycled: 'bg-emerald-100 text-emerald-700',
};

export function CyclingPanel({
  tank,
  tests,
  doses,
  onUpdated,
}: {
  tank: Tank;
  tests: WaterTest[];
  doses: CyclingDose[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [waterFillDate, setWaterFillDate] = useState(tank.setup_date ?? '');
  const [savingDate, setSavingDate] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [ammoniaTarget, setAmmoniaTarget] = useState('2');
  const [doseNote, setDoseNote] = useState('');
  const [savingDose, setSavingDose] = useState(false);
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [editDoseForm, setEditDoseForm] = useState<{ dosed_at: string; ammonia_ppm_target: string; note: string }>({
    dosed_at: '',
    ammonia_ppm_target: '',
    note: '',
  });
  const [savingDoseEdit, setSavingDoseEdit] = useState(false);

  const suggestion = suggestCyclingStatus(tests, doses);
  const days = daysSince(tank.setup_date);

  async function handleSaveDate(e: React.FormEvent) {
    e.preventDefault();
    setSavingDate(true);
    await supabase.from('tanks').update({ setup_date: waterFillDate || null }).eq('id', tank.id);
    setSavingDate(false);
    onUpdated();
  }

  async function handleSetStatus(status: CyclingStatus) {
    setSavingStatus(true);
    await supabase.from('tanks').update({ cycling_status: status }).eq('id', tank.id);
    setSavingStatus(false);
    onUpdated();
  }

  async function handleAddDose(e: React.FormEvent) {
    e.preventDefault();
    setSavingDose(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('cycling_doses').insert({
      tank_id: tank.id,
      user_id: user.id,
      ammonia_ppm_target: ammoniaTarget ? parseFloat(ammoniaTarget) : null,
      note: doseNote || null,
    });
    setSavingDose(false);
    setDoseNote('');
    onUpdated();
  }

  async function handleDeleteDose(id: string) {
    await supabase.from('cycling_doses').delete().eq('id', id);
    onUpdated();
  }

  function startEditDose(dose: CyclingDose) {
    setEditingDoseId(dose.id);
    setEditDoseForm({
      dosed_at: toDatetimeLocal(dose.dosed_at),
      ammonia_ppm_target: dose.ammonia_ppm_target !== null ? String(dose.ammonia_ppm_target) : '',
      note: dose.note ?? '',
    });
  }

  function cancelEditDose() {
    setEditingDoseId(null);
  }

  async function saveEditDose(id: string) {
    setSavingDoseEdit(true);
    await supabase
      .from('cycling_doses')
      .update({
        dosed_at: new Date(editDoseForm.dosed_at).toISOString(),
        ammonia_ppm_target: editDoseForm.ammonia_ppm_target ? parseFloat(editDoseForm.ammonia_ppm_target) : null,
        note: editDoseForm.note || null,
      })
      .eq('id', id);
    setSavingDoseEdit(false);
    setEditingDoseId(null);
    onUpdated();
  }

  const cycleNotComplete = tank.cycling_status !== 'cycled';

  // Suivi visuel du cyclage : ammoniac/nitrites/nitrates dans le temps, avec
  // des repères verticaux pour chaque apport d'ammoniac (fishless cycling).
  const chartData = [...tests]
    .sort((a, b) => new Date(a.tested_at).getTime() - new Date(b.tested_at).getTime())
    .map((t) => ({
      dateLabel: new Date(t.tested_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      timestamp: new Date(t.tested_at).getTime(),
      Ammoniac: t.ammonia_ppm,
      Nitrites: t.nitrite_ppm,
      Nitrates: t.nitrate_ppm,
    }));

  const doseMarkers = [...doses].sort(
    (a, b) => new Date(a.dosed_at).getTime() - new Date(b.dosed_at).getTime()
  );

  return (
    <div className="space-y-6">
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-1 font-semibold text-slate-900">Suivi visuel du cyclage</h3>
          <p className="mb-3 text-xs text-slate-400">
            Ammoniac et nitrites doivent redescendre vers 0 pendant que les nitrates apparaissent.
            {doseMarkers.length > 0 && ' Les traits pointillés marquent tes apports d’ammoniac.'}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Ammoniac" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Nitrites" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Nitrates" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              {doseMarkers.map((d) => {
                const label = new Date(d.dosed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                const match = chartData.find((c) => c.dateLabel === label);
                return match ? (
                  <ReferenceLine key={d.id} x={label} stroke="#94a3b8" strokeDasharray="4 4" />
                ) : null;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {chartData.length <= 1 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-400">
          Enregistre au moins deux tests d&apos;eau (onglet « Paramètres d&apos;eau ») pour voir apparaître le suivi visuel du cyclage.
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Mise en eau</h3>
          {days !== null && <span className="text-sm text-slate-500">{days} jour{days > 1 ? 's' : ''}</span>}
        </div>
        <form onSubmit={handleSaveDate} className="flex items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Date de mise en eau</label>
            <input
              type="date"
              value={waterFillDate}
              onChange={(e) => setWaterFillDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingDate}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Droplets size={14} /> {savingDate ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Statut du cyclage</h3>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABELS) as CyclingStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleSetStatus(status)}
              disabled={savingStatus}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                tank.cycling_status === status
                  ? STATUS_STYLES[status]
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className={`rounded-lg px-3 py-2 text-sm ${STATUS_STYLES[suggestion.suggestion]}`}>
          <span className="font-medium">Suggestion d&apos;après tes derniers tests : {suggestion.label}.</span>{' '}
          {suggestion.explanation}
        </div>

        {cycleNotComplete && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Tant que le cycle n&apos;est pas marqué terminé, évite d&apos;introduire des poissons
            sensibles à l&apos;ammoniac et aux nitrites — ou fais-le très progressivement en
            surveillant les paramètres de près.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Journal des apports d&apos;ammoniac</h3>
        <p className="mb-3 text-xs text-slate-400">
          Pour un cyclage sans poisson (fishless cycling) : note chaque ajout d&apos;ammoniac pour
          suivre la progression aux côtés de tes tests d&apos;eau.
        </p>
        <form onSubmit={handleAddDose} className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Ammoniac visé (ppm)</label>
            <input
              type="number"
              step="0.1"
              value={ammoniaTarget}
              onChange={(e) => setAmmoniaTarget(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="min-w-[10rem] flex-1 space-y-1">
            <label className="text-xs font-medium text-slate-600">Note (optionnel)</label>
            <input
              value={doseNote}
              onChange={(e) => setDoseNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingDose}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <FlaskConical size={14} /> Ajouter
          </button>
        </form>

        <div className="space-y-1.5">
          {doses.map((dose) =>
            editingDoseId === dose.id ? (
              <div key={dose.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Date</label>
                  <input
                    type="datetime-local"
                    value={editDoseForm.dosed_at}
                    onChange={(e) => setEditDoseForm((f) => ({ ...f, dosed_at: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Ammoniac (ppm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editDoseForm.ammonia_ppm_target}
                    onChange={(e) => setEditDoseForm((f) => ({ ...f, ammonia_ppm_target: e.target.value }))}
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="min-w-[8rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Note</label>
                  <input
                    value={editDoseForm.note}
                    onChange={(e) => setEditDoseForm((f) => ({ ...f, note: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEditDose(dose.id)}
                    disabled={savingDoseEdit}
                    className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    title="Enregistrer"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEditDose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Annuler">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={dose.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">
                    {dose.ammonia_ppm_target !== null ? `${dose.ammonia_ppm_target} ppm` : 'Apport'}
                  </span>
                  {dose.note && <span className="text-slate-500"> — {dose.note}</span>}
                  <div className="text-xs text-slate-400">
                    {new Date(dose.dosed_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditDose(dose)} className="text-slate-400 hover:text-teal-600" title="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDeleteDose(dose.id)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
          {doses.length === 0 && <p className="text-sm text-slate-400">Aucun apport enregistré</p>}
        </div>
      </div>
    </div>
  );
}
