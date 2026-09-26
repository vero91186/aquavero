'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fileToBase64 } from '@/lib/image';
import type { WaterTest } from '@/types/database';
import { Camera, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';

// Convertit un timestamp ISO en valeur affichable/éditable par un
// <input type="datetime-local"> (qui attend l'heure locale sans fuseau).
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const FIELDS: { key: keyof WaterTest; label: string; unit: string }[] = [
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'ammonia_ppm', label: 'Ammoniac', unit: 'ppm' },
  { key: 'nitrite_ppm', label: 'Nitrites', unit: 'ppm' },
  { key: 'nitrate_ppm', label: 'Nitrates', unit: 'ppm' },
  { key: 'gh_dgh', label: 'GH', unit: '°dGH' },
  { key: 'kh_dkh', label: 'KH', unit: '°dKH' },
  { key: 'temperature_c', label: 'Température', unit: '°C' },
];

export function WaterTestsPanel({ tankId, tests, onUpdated }: {
  tankId: string;
  tests: WaterTest[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setError(null);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch('/api/ai/ocr-test-strip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, imageMimeType: mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const values = data.values;
      setForm((f) => ({
        ...f,
        ph: values.ph ?? f.ph ?? '',
        ammonia_ppm: values.ammonia_ppm ?? f.ammonia_ppm ?? '',
        nitrite_ppm: values.nitrite_ppm ?? f.nitrite_ppm ?? '',
        nitrate_ppm: values.nitrate_ppm ?? f.nitrate_ppm ?? '',
        gh_dgh: values.gh_dgh ?? f.gh_dgh ?? '',
        kh_dkh: values.kh_dkh ?? f.kh_dkh ?? '',
        temperature_c: values.temperature_c ?? f.temperature_c ?? '',
      }));
      setOcrNote(values.confidence_note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de lecture de la photo');
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload: Record<string, unknown> = {
      tank_id: tankId,
      user_id: user.id,
      source: ocrNote ? 'photo_ai' : 'manual',
    };
    for (const field of FIELDS) {
      if (form[field.key]) payload[field.key] = parseFloat(form[field.key]);
    }

    const { error } = await supabase.from('water_tests').insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm({});
    setOcrNote(null);
    onUpdated();
  }

  function startEdit(t: WaterTest) {
    setEditingId(t.id);
    const f: Record<string, string> = { tested_at: toDatetimeLocal(t.tested_at) };
    for (const field of FIELDS) {
      const v = t[field.key];
      f[field.key] = v === null || v === undefined ? '' : String(v);
    }
    setEditForm(f);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    const payload: Record<string, unknown> = {
      tested_at: new Date(editForm.tested_at).toISOString(),
    };
    for (const field of FIELDS) {
      payload[field.key] = editForm[field.key] ? parseFloat(editForm[field.key]) : null;
    }
    const { error } = await supabase.from('water_tests').update(payload).eq('id', id);
    setSavingEdit(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEditingId(null);
    setEditForm({});
    onUpdated();
  }

  async function handleDeleteTest(id: string) {
    await supabase.from('water_tests').delete().eq('id', id);
    onUpdated();
  }

  const chartData = [...tests]
    .sort((a, b) => new Date(a.tested_at).getTime() - new Date(b.tested_at).getTime())
    .map((t) => ({
      date: new Date(t.tested_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      pH: t.ph,
      NO2: t.nitrite_ppm,
      NO3: t.nitrate_ppm,
    }));

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Nouveau test</h3>
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50">
            {ocrLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            Photo bandelette
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {ocrNote && <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700">{ocrNote}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                {field.label} {field.unit && `(${field.unit})`}
              </label>
              <input
                type="number"
                step="0.01"
                value={form[field.key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le test'}
        </button>
      </form>

      {chartData.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Tendance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="pH" stroke="#0d9488" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="NO2" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="NO3" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Historique</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="pb-2 pr-4">Date</th>
                {FIELDS.map((f) => (
                  <th key={f.key} className="pb-2 pr-4">{f.label}</th>
                ))}
                <th className="pb-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {tests.slice(0, 15).map((t) =>
                editingId === t.id ? (
                  <tr key={t.id} className="border-t border-slate-100 bg-slate-50">
                    <td className="py-2 pr-4">
                      <input
                        type="datetime-local"
                        value={editForm.tested_at ?? ''}
                        onChange={(e) => setEditForm((f) => ({ ...f, tested_at: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="py-2 pr-4">
                        <input
                          type="number"
                          step="0.01"
                          value={editForm[f.key] ?? ''}
                          onChange={(e) => setEditForm((ef) => ({ ...ef, [f.key]: e.target.value }))}
                          className="w-16 rounded-lg border border-slate-300 px-1.5 py-1 text-xs"
                        />
                      </td>
                    ))}
                    <td className="py-2 pr-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(t.id)}
                          disabled={savingEdit}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                          title="Enregistrer"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100"
                          title="Annuler"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 text-slate-500">
                      {new Date(t.tested_at).toLocaleDateString('fr-FR')}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="py-2 pr-4">{(t[f.key] as number | null) ?? '—'}</td>
                    ))}
                    <td className="py-2 pr-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(t)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-600"
                          title="Modifier"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(t.id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={FIELDS.length + 2} className="py-4 text-center text-slate-400">
                    Aucun test enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
