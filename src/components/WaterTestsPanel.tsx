'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { fileToBase64 } from '@/lib/image';
import type { WaterTest } from '@/types/database';
import { Camera, Loader2 } from 'lucide-react';

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
              </tr>
            </thead>
            <tbody>
              {tests.slice(0, 15).map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-500">
                    {new Date(t.tested_at).toLocaleDateString('fr-FR')}
                  </td>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="py-2 pr-4">{(t[f.key] as number | null) ?? '—'}</td>
                  ))}
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={FIELDS.length + 1} className="py-4 text-center text-slate-400">
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
