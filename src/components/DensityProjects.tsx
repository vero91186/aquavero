'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  computeDensity,
  densityLevel,
  scalePopulation,
  type DensityLine,
} from '@/lib/density';
import { FolderOpen, Save, Trash2, Layers } from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  lines: DensityLine[];
  net_liters: number | null;
  ratio_net: number | null;
  created_at: string;
}

const ALTERNATIVES: { target: number; title: string }[] = [
  { target: 1, title: 'Très aéré' },
  { target: 1.25, title: 'Confortable' },
  { target: 1.45, title: 'Limite raisonnable' },
];

const fmt = (n: number, d = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const summary = (lines: DensityLine[]) => lines.map((l) => `${l.quantity} ${l.name}`).join(', ');

// Projets de peuplement : on enregistre la simulation en cours sous un nom,
// on la recharge plus tard, et on compare des variantes calculées « en
// proportion » (mêmes espèces, mêmes proportions, quantités ajustées).
export function DensityProjects({
  tankId,
  lines,
  netLiters,
  onLoad,
}: {
  tankId: string;
  lines: DensityLine[];
  netLiters: number;
  onLoad: (lines: DensityLine[]) => void;
}) {
  const supabase = createClient();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('density_scenarios')
      .select('*')
      .eq('tank_id', tankId)
      .order('created_at', { ascending: false });
    if (err) {
      setError('Les projets ne sont pas encore disponibles : lance la migration 0014_density_scenarios.sql dans Supabase.');
      return;
    }
    setError(null);
    setScenarios((data ?? []) as Scenario[]);
  }, [supabase, tankId]);

  useEffect(() => {
    // Chargement initial depuis Supabase : le setState se fait après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const active = lines.filter((l) => l.quantity > 0);
  const result = computeDensity(active, netLiters, null, null);

  async function saveProject(project: DensityLine[], projectName: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBusy(true);
    const r = computeDensity(project, netLiters, null, null);
    const { error: err } = await supabase.from('density_scenarios').insert({
      tank_id: tankId,
      user_id: userData.user.id,
      name: projectName,
      lines: project.map((l) => ({ id: l.id, name: l.name, scientificName: l.scientificName, sizeCm: l.sizeCm, quantity: l.quantity, kind: l.kind, zone: l.zone })),
      net_liters: netLiters,
      ratio_net: Math.round(r.ratioNet * 1000) / 1000,
    });
    setBusy(false);
    if (err) setError(`Enregistrement impossible : ${err.message}`);
    else await load();
  }

  async function remove(id: string) {
    await supabase.from('density_scenarios').delete().eq('id', id);
    await load();
  }

  const asLoaded = (ls: DensityLine[]): DensityLine[] =>
    ls.map((l, i) => ({ ...l, id: `proj-${Date.now()}-${i}`, hypothetical: true }));

  const alternatives =
    active.length > 0 && netLiters > 0
      ? ALTERNATIVES.map((a) => {
          const scaled = scalePopulation(active, netLiters, a.target);
          return { ...a, lines: scaled, result: computeDensity(scaled, netLiters, null, null) };
        }).filter((a) => a.lines.length > 0)
      : [];

  return (
    <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
      {alternatives.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Layers size={17} className="text-teal-600" />
            <h4 className="text-lg text-slate-900">Alternatives en proportion</h4>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Mêmes espèces et mêmes proportions que ta simulation actuelle ({fmt(result.ratioNet)} cm/L), avec des
            quantités ajustées pour viser une autre densité. Une espèce très grande peut disparaître d’une variante
            serrée.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {alternatives.map((a) => {
              const lvl = densityLevel(a.result.ratioNet);
              return (
                <article key={a.target} className="flex flex-col rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="text-2xl font-semibold tabular-nums text-teal-700">
                    {fmt(a.result.ratioNet)} <span className="text-xs font-medium text-slate-400">cm/L, {lvl.label.toLowerCase()}</span>
                  </p>
                  <p className="mt-1 flex-1 text-xs text-slate-600">{summary(a.lines)}</p>
                  <p className="mt-1 text-xs text-slate-400">{a.result.animalCount} animaux</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLoad(asLoaded(a.lines))}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Simuler
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveProject(a.lines, `${a.title}, ${fmt(a.target, 2)} cm/L`)}
                      className="rounded-full border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                    >
                      Enregistrer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-lg text-slate-900">Mes projets de peuplement</h4>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du projet, par exemple Version avec corydoras en plus"
            className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={busy || active.length === 0 || !name.trim()}
            onClick={async () => {
              await saveProject(active, name.trim());
              setName('');
            }}
            className="flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <Save size={14} /> Enregistrer la simulation
          </button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}

        <div className="mt-3 space-y-2">
          {scenarios.map((s) => {
            const lvl = s.ratio_net !== null ? densityLevel(s.ratio_net) : null;
            return (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.ratio_net !== null && (
                      <span className="font-semibold text-teal-700">
                        {fmt(Number(s.ratio_net))} cm/L{lvl ? `, ${lvl.label.toLowerCase()}` : ''}
                      </span>
                    )}
                    {s.ratio_net !== null && ' sur '}
                    {s.net_liters ? `${fmt(Number(s.net_liters), 0)} L` : ''}
                    {', '}
                    {new Date(s.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">{summary(s.lines)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onLoad(asLoaded(s.lines))}
                    className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <FolderOpen size={13} /> Ouvrir
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    aria-label={`Supprimer ${s.name}`}
                    className="rounded-full p-1.5 text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {scenarios.length === 0 && !error && (
            <p className="text-sm text-slate-400">
              Aucun projet pour l’instant. Compose une simulation puis donne-lui un nom pour la retrouver.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
