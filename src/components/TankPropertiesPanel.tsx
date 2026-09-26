'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tank, WaterType } from '@/types/database';
import { Save } from 'lucide-react';

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  freshwater: 'Eau douce',
  saltwater: 'Eau de mer',
  brackish: 'Eau saumâtre',
};

export function TankPropertiesPanel({ tank, onUpdated }: { tank: Tank; onUpdated: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: tank.name,
    volume_liters: String(tank.volume_liters),
    water_type: tank.water_type,
    length_cm: tank.length_cm !== null ? String(tank.length_cm) : '',
    width_cm: tank.width_cm !== null ? String(tank.width_cm) : '',
    height_cm: tank.height_cm !== null ? String(tank.height_cm) : '',
    substrate: tank.substrate ?? '',
    fertile_soil: tank.fertile_soil,
    lighting_hours_per_day: tank.lighting_hours_per_day !== null ? String(tank.lighting_hours_per_day) : '',
    is_planted: tank.is_planted,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from('tanks')
      .update({
        name: form.name,
        volume_liters: parseFloat(form.volume_liters) || tank.volume_liters,
        water_type: form.water_type,
        length_cm: form.length_cm ? parseFloat(form.length_cm) : null,
        width_cm: form.width_cm ? parseFloat(form.width_cm) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        substrate: form.substrate || null,
        fertile_soil: form.fertile_soil,
        lighting_hours_per_day: form.lighting_hours_per_day ? parseFloat(form.lighting_hours_per_day) : null,
        is_planted: form.is_planted,
      })
      .eq('id', tank.id);
    setSaving(false);
    setSaved(true);
    onUpdated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Identité du bac</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Nom du bac</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Type d&apos;eau</label>
            <select
              value={form.water_type}
              onChange={(e) => set('water_type', e.target.value as WaterType)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {(Object.keys(WATER_TYPE_LABELS) as WaterType[]).map((t) => (
                <option key={t} value={t}>{WATER_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={form.is_planted} onChange={(e) => set('is_planted', e.target.checked)} />
            Bac planté
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Litrage et dimensions</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Volume (L)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.volume_liters}
              onChange={(e) => set('volume_liters', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Longueur (cm)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.length_cm}
              onChange={(e) => set('length_cm', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Largeur (cm)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.width_cm}
              onChange={(e) => set('width_cm', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Hauteur (cm)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={form.height_cm}
              onChange={(e) => set('height_cm', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Sol et éclairage</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Substrat</label>
            <input
              placeholder="ex. Sable de Loire, gravier fin..."
              value={form.substrate}
              onChange={(e) => set('substrate', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={form.fertile_soil} onChange={(e) => set('fertile_soil', e.target.checked)} />
            Sol fertile / nutritif sous le substrat
          </label>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Éclairage (heures/jour)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={form.lighting_hours_per_day}
              onChange={(e) => set('lighting_hours_per_day', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Save size={16} /> {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
      </button>
    </form>
  );
}
