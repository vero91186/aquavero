'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EquipmentKind, Tank, TankEquipment } from '@/types/database';
import { Box, Filter, Fan, Flame, Lightbulb, Wind, Wrench, Trash2, Plus, Wand2 } from 'lucide-react';

const KINDS: { key: EquipmentKind; label: string; icon: React.ReactNode }[] = [
  { key: 'aquarium', label: 'Aquarium', icon: <Box size={18} /> },
  { key: 'filter', label: 'Filtre', icon: <Filter size={18} /> },
  { key: 'pump', label: 'Pompe', icon: <Fan size={18} /> },
  { key: 'heater', label: 'Chauffage', icon: <Flame size={18} /> },
  { key: 'light', label: 'Éclairage', icon: <Lightbulb size={18} /> },
  { key: 'co2', label: 'CO₂', icon: <Wind size={18} /> },
  { key: 'other', label: 'Autre', icon: <Wrench size={18} /> },
];

type Draft = Pick<TankEquipment, 'kind' | 'name' | 'specs' | 'power_w' | 'flow_lph'>;

// Matériel livré avec le Juwel Rio 180 LED, tel que décrit dans le projet.
const JUWEL_RIO_180: Draft[] = [
  {
    kind: 'aquarium',
    name: 'Juwel Rio 180 LED',
    specs: '101 × 41 × 50 cm, 180 L bruts (aquarium vide), environ 150 L d’eau réelle. Meuble SBX assorti.',
    power_w: null,
    flow_lph: null,
  },
  {
    kind: 'filter',
    name: 'Juwel Bioflow M',
    specs: 'Filtre interne en bloc dans l’angle arrière, masses filtrantes en cartouche. À rincer à l’eau du bac, jamais au robinet.',
    power_w: null,
    flow_lph: null,
  },
  {
    kind: 'pump',
    name: 'Juwel Eccoflow 600',
    specs: 'Pompe du Bioflow M, 600 L/h, soit environ 4 renouvellements du volume par heure.',
    power_w: null,
    flow_lph: 600,
  },
  {
    kind: 'heater',
    name: 'Juwel AquaHeat Pro 200',
    specs: 'Chauffage régulé 200 W avec thermostat, cible 24 à 26 °C.',
    power_w: 200,
    flow_lph: null,
  },
  {
    kind: 'light',
    name: 'Juwel MultiLux LED 100',
    specs: 'Rampe LED non réglable, allumée 8 h par jour sur programmateur.',
    power_w: null,
    flow_lph: null,
  },
];

export function EquipmentPanel({ tank, onUpdated }: { tank: Tank; onUpdated?: () => void }) {
  const supabase = createClient();
  const [items, setItems] = useState<TankEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ kind: 'filter' as EquipmentKind, name: '', specs: '', power_w: '', flow_lph: '' });

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('tank_equipment')
      .select('*')
      .eq('tank_id', tank.id)
      .order('created_at', { ascending: true });
    if (err) {
      setError(
        "Le matériel n'est pas encore disponible : lance la migration 0011_equipment.sql dans Supabase, puis recharge la page."
      );
    } else {
      setError(null);
      setItems((data ?? []) as TankEquipment[]);
    }
    setLoading(false);
  }, [supabase, tank.id]);

  useEffect(() => {
    // Chargement initial depuis Supabase : le setState se fait après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function insert(drafts: Draft[]) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    setBusy(true);
    const { error: err } = await supabase
      .from('tank_equipment')
      .insert(drafts.map((d) => ({ ...d, tank_id: tank.id, user_id: user.id })));
    setBusy(false);
    if (err) setError(`Enregistrement impossible : ${err.message}`);
    else await load();
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await insert([
      {
        kind: form.kind,
        name: form.name.trim(),
        specs: form.specs.trim() || null,
        power_w: form.power_w ? parseFloat(form.power_w) : null,
        flow_lph: form.flow_lph ? parseFloat(form.flow_lph) : null,
      },
    ]);
    setForm({ kind: form.kind, name: '', specs: '', power_w: '', flow_lph: '' });
  }

  async function remove(id: string) {
    await supabase.from('tank_equipment').delete().eq('id', id);
    await load();
  }

  async function importJuwel() {
    const present = new Set(items.map((i) => i.name.toLowerCase()));
    const missing = JUWEL_RIO_180.filter((d) => !present.has(d.name.toLowerCase()));
    if (missing.length > 0) await insert(missing);
    // Complète les propriétés du bac sans écraser ce qui est déjà saisi.
    const patch: Record<string, number> = {};
    if (!tank.length_cm) patch.length_cm = 101;
    if (!tank.width_cm) patch.width_cm = 41;
    if (!tank.height_cm) patch.height_cm = 50;
    if (Object.keys(patch).length > 0) {
      await supabase.from('tanks').update(patch).eq('id', tank.id);
      onUpdated?.();
    }
  }

  const flow = items.find((i) => i.kind === 'pump' && i.flow_lph)?.flow_lph ?? null;
  const net = tank.volume_liters;
  const juwelComplete = JUWEL_RIO_180.every((d) => items.some((i) => i.name.toLowerCase() === d.name.toLowerCase()));

  const dims =
    tank.length_cm && tank.width_cm && tank.height_cm
      ? `${tank.length_cm} × ${tank.width_cm} × ${tank.height_cm} cm`
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-abysse p-5 text-white">
        <h2 className="text-2xl">Fiche technique</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Fact label="Volume brut" value={tank.gross_volume_liters ? `${tank.gross_volume_liters} L` : 'à renseigner'} />
          <Fact label="Volume réel" value={`${net} L`} />
          <Fact label="Dimensions" value={dims ?? 'à renseigner'} />
          <Fact
            label="Brassage filtre"
            value={flow && net > 0 ? `${Math.round((flow / net) * 10) / 10} fois par heure` : 'pompe à ajouter'}
          />
        </dl>
      </section>

      {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}

      {!juwelComplete && !error && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm text-teal-900">
            Ton bac est un Juwel Rio 180 ? Ajoute en un clic le filtre, la pompe, le chauffage et l’éclairage d’origine.
          </p>
          <button
            onClick={importJuwel}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <Wand2 size={15} /> Ajouter le matériel du Juwel Rio 180
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => {
            const k = KINDS.find((x) => x.key === it.kind) ?? KINDS[KINDS.length - 1];
            const figures = [it.power_w ? `${it.power_w} W` : null, it.flow_lph ? `${it.flow_lph} L/h` : null].filter(Boolean);
            return (
              <article key={it.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-teal-700">
                    {k.icon}
                    <span className="text-sm font-medium">{k.label}</span>
                  </div>
                  <button onClick={() => remove(it.id)} aria-label={`Supprimer ${it.name}`} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
                <h3 className="mt-2 text-lg text-slate-900">{it.name}</h3>
                {figures.length > 0 && <p className="text-sm font-semibold text-teal-700">{figures.join(', ')}</p>}
                {it.specs && <p className="mt-1 text-sm text-slate-600">{it.specs}</p>}
              </article>
            );
          })}
          {items.length === 0 && !error && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 sm:col-span-2">
              Aucun matériel pour l’instant. Ajoute le filtre, l’éclairage ou le chauffage ci-dessous.
            </p>
          )}
        </div>
      )}

      {!error && (
        <form onSubmit={addManual} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg text-slate-900">Ajouter un équipement</h3>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as EquipmentKind })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Type d’équipement"
            >
              {KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Modèle, par exemple Juwel Bioflow M"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="0"
              value={form.power_w}
              onChange={(e) => setForm({ ...form, power_w: e.target.value })}
              placeholder="Puissance (W)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              value={form.flow_lph}
              onChange={(e) => setForm({ ...form, flow_lph: e.target.value })}
              placeholder="Débit (L/h)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={form.specs}
            onChange={(e) => setForm({ ...form, specs: e.target.value })}
            placeholder="Caractéristiques, réglages, entretien"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus size={15} /> Ajouter
          </button>
        </form>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-teal-200">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-sable">{value}</dd>
    </div>
  );
}
