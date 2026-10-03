'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Tank } from '@/types/database';
import { Plus, Droplets, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTanks();
    // loadTanks n'a pas besoin d'être dans les dépendances : on ne veut recharger
    // qu'au montage, pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTanks() {
    setLoading(true);
    const { data } = await supabase.from('tanks').select('*').order('created_at', { ascending: false });
    setTanks(data ?? []);
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-abysse text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <h1 className="text-3xl">Mes bacs</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-sm text-teal-200 hover:text-white"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {tanks.length} bac{tanks.length > 1 ? 's' : ''} suivi{tanks.length > 1 ? 's' : ''}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <Plus size={16} /> Nouveau bac
          </button>
        </div>

        {showForm && (
          <NewTankForm
            onCreated={() => {
              setShowForm(false);
              loadTanks();
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : tanks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Droplets className="mx-auto mb-3 text-teal-500" size={32} />
            <p className="text-slate-600">Aucun bac pour l&apos;instant. Ajoute ton premier aquarium.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tanks.map((tank) => (
              <Link
                key={tank.id}
                href={`/tanks/${tank.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-400"
              >
                <p className="text-4xl font-semibold tracking-tight text-teal-700">
                  {tank.volume_liters}
                  <span className="ml-1 text-base font-medium text-slate-400">L</span>
                </p>
                <h2 className="mt-3 text-xl text-slate-900">{tank.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {tank.gross_volume_liters ? `${tank.gross_volume_liters} L bruts, ` : ''}
                  {waterTypeLabel(tank.water_type)}
                  {tank.is_planted ? ', planté' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function waterTypeLabel(type: string) {
  if (type === 'saltwater') return 'eau de mer';
  if (type === 'brackish') return 'eau saumâtre';
  return 'eau douce';
}

function NewTankForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [waterType, setWaterType] = useState('freshwater');
  const [isPlanted, setIsPlanted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('tanks').insert({
      user_id: user.id,
      name,
      volume_liters: parseFloat(volume),
      water_type: waterType,
      is_planted: isPlanted,
      setup_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Nom du bac</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="ex. Rio 180"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Volume (litres)</label>
          <input
            required
            type="number"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Type d&apos;eau</label>
          <select
            value={waterType}
            onChange={(e) => setWaterType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="freshwater">Eau douce</option>
            <option value="saltwater">Eau de mer</option>
            <option value="brackish">Eau saumâtre</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={isPlanted} onChange={(e) => setIsPlanted(e.target.checked)} />
          Bac planté
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Création…' : 'Créer le bac'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
