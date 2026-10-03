'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Livestock, Tank, WaterType } from '@/types/database';
import { DensitySimulator } from '@/components/DensitySimulator';
import { Save } from 'lucide-react';

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  freshwater: 'Eau douce',
  saltwater: 'Eau de mer',
  brackish: 'Eau saumâtre',
};

export function TankPropertiesPanel({
  tank,
  livestock,
  onUpdated,
}: {
  tank: Tank;
  livestock: Livestock[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: tank.name,
    volume_liters: String(tank.volume_liters),
    gross_volume_liters: tank.gross_volume_liters !== null && tank.gross_volume_liters !== undefined ? String(tank.gross_volume_liters) : '',
    water_type: tank.water_type,
    length_cm: tank.length_cm !== null ? String(tank.length_cm) : '',
    width_cm: tank.width_cm !== null ? String(tank.width_cm) : '',
    height_cm: tank.height_cm !== null ? String(tank.height_cm) : '',
    substrate: tank.substrate ?? '',
    fertile_soil: tank.fertile_soil,
    lighting_hours_per_day: tank.lighting_hours_per_day !== null ? String(tank.lighting_hours_per_day) : '',
    is_planted: tank.is_planted,
    tap_analyzed_at: tank.tap_analyzed_at ?? '',
    tap_ph: tank.tap_ph !== null ? String(tank.tap_ph) : '',
    tap_gh_dgh: tank.tap_gh_dgh !== null ? String(tank.tap_gh_dgh) : '',
    tap_kh_dkh: tank.tap_kh_dkh !== null ? String(tank.tap_kh_dkh) : '',
    tap_nitrate_ppm: tank.tap_nitrate_ppm !== null ? String(tank.tap_nitrate_ppm) : '',
    tap_chlorine_total_mg_l: tank.tap_chlorine_total_mg_l !== null ? String(tank.tap_chlorine_total_mg_l) : '',
    tap_temperature_c: tank.tap_temperature_c !== null ? String(tank.tap_temperature_c) : '',
    tap_conductivity_us_cm: tank.tap_conductivity_us_cm !== null ? String(tank.tap_conductivity_us_cm) : '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const payload = {
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
        tap_analyzed_at: form.tap_analyzed_at || null,
        tap_ph: form.tap_ph ? parseFloat(form.tap_ph) : null,
        tap_gh_dgh: form.tap_gh_dgh ? parseFloat(form.tap_gh_dgh) : null,
        tap_kh_dkh: form.tap_kh_dkh ? parseFloat(form.tap_kh_dkh) : null,
        tap_nitrate_ppm: form.tap_nitrate_ppm ? parseFloat(form.tap_nitrate_ppm) : null,
        tap_chlorine_total_mg_l: form.tap_chlorine_total_mg_l ? parseFloat(form.tap_chlorine_total_mg_l) : null,
        tap_temperature_c: form.tap_temperature_c ? parseFloat(form.tap_temperature_c) : null,
        tap_conductivity_us_cm: form.tap_conductivity_us_cm ? parseFloat(form.tap_conductivity_us_cm) : null,
    };
    const grossLiters = form.gross_volume_liters ? parseFloat(form.gross_volume_liters) : null;
    let { error } = await supabase
      .from('tanks')
      .update({ ...payload, gross_volume_liters: grossLiters })
      .eq('id', tank.id);
    if (error && /gross_volume_liters/.test(error.message)) {
      // Colonne absente : la migration 0010 n'est pas encore appliquée. On
      // enregistre le reste pour ne rien perdre, et on le dit.
      ({ error } = await supabase.from('tanks').update(payload).eq('id', tank.id));
      if (!error) {
        setSaveError(
          "Le reste est enregistré, mais pas le volume brut : applique d'abord la migration 0010_gross_volume.sql dans Supabase."
        );
      }
    }
    if (error) setSaveError(error.message);
    setSaving(false);
    setSaved(!error);
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
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Volume réel (L)</label>
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
            <label className="text-xs font-medium text-slate-600">Volume brut (L)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="annoncé par le fabricant"
              value={form.gross_volume_liters}
              onChange={(e) => set('gross_volume_liters', e.target.value)}
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

      <DensitySimulator
        livestock={livestock}
        netLiters={parseFloat(form.volume_liters) || 0}
        grossLiters={parseFloat(form.gross_volume_liters) || null}
      />

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

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-slate-900">Eau du robinet (analyse de ville)</h3>
        <p className="mb-3 text-xs text-slate-500">
          Renseigne ici les valeurs de la dernière analyse de l&apos;eau de ta commune (mairie /
          distributeur) : ça sert de repère pour tes changements d&apos;eau, à comparer avec les
          tests de ton bac. Le titre hydrotimétrique (TH) correspond au GH, le titre alcalimétrique
          complet (TAC) au KH — en °f, à multiplier par 0,56 pour les convertir en °dGH / °dKH.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Date de l&apos;analyse</label>
            <input
              type="date"
              value={form.tap_analyzed_at}
              onChange={(e) => set('tap_analyzed_at', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">pH</label>
            <input
              type="number"
              step="0.1"
              value={form.tap_ph}
              onChange={(e) => set('tap_ph', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">GH (°dGH)</label>
            <input
              type="number"
              step="0.1"
              value={form.tap_gh_dgh}
              onChange={(e) => set('tap_gh_dgh', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">KH (°dKH)</label>
            <input
              type="number"
              step="0.1"
              value={form.tap_kh_dkh}
              onChange={(e) => set('tap_kh_dkh', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Nitrates (mg/L)</label>
            <input
              type="number"
              step="0.1"
              value={form.tap_nitrate_ppm}
              onChange={(e) => set('tap_nitrate_ppm', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Chlore total (mg/L)</label>
            <input
              type="number"
              step="0.01"
              value={form.tap_chlorine_total_mg_l}
              onChange={(e) => set('tap_chlorine_total_mg_l', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Température (°C)</label>
            <input
              type="number"
              step="0.1"
              value={form.tap_temperature_c}
              onChange={(e) => set('tap_temperature_c', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Conductivité (µS/cm)</label>
            <input
              type="number"
              step="1"
              value={form.tap_conductivity_us_cm}
              onChange={(e) => set('tap_conductivity_us_cm', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        {form.tap_chlorine_total_mg_l && parseFloat(form.tap_chlorine_total_mg_l) > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Chlore détecté dans l&apos;eau du robinet : pense toujours au conditionneur d&apos;eau
            lors des changements d&apos;eau (calculateur dans l&apos;onglet Entretien).
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Save size={16} /> {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
      </button>
      {saveError && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{saveError}</p>}
    </form>
  );
}
