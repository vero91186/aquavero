'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Tank, WaterTest, Livestock, MaintenanceLog, CyclingDose } from '@/types/database';
import { computeHealthScore } from '@/lib/health-score';
import { HealthScoreCard } from '@/components/HealthScoreCard';
import { WaterTestsPanel } from '@/components/WaterTestsPanel';
import { LivestockPanel } from '@/components/LivestockPanel';
import { MaintenancePanel } from '@/components/MaintenancePanel';
import { AiAssistantPanel } from '@/components/AiAssistantPanel';
import { CyclingPanel } from '@/components/CyclingPanel';
import { StockingCalculator } from '@/components/StockingCalculator';
import { PopulationOverview } from '@/components/PopulationOverview';
import { ArrowLeft, Sparkles } from 'lucide-react';

type Tab = 'apercu' | 'parametres' | 'cyclage' | 'peuplement' | 'plantes' | 'entretien' | 'assistant';

export default function TankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tankId = params.id as string;
  const supabase = createClient();

  const [tank, setTank] = useState<Tank | null>(null);
  const [tests, setTests] = useState<WaterTest[]>([]);
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [doses, setDoses] = useState<CyclingDose[]>([]);
  const [tab, setTab] = useState<Tab>('apercu');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [tankRes, testsRes, livestockRes, logsRes, dosesRes] = await Promise.all([
      supabase.from('tanks').select('*').eq('id', tankId).single(),
      supabase.from('water_tests').select('*').eq('tank_id', tankId).order('tested_at', { ascending: false }),
      supabase.from('livestock').select('*').eq('tank_id', tankId),
      supabase.from('maintenance_logs').select('*').eq('tank_id', tankId).order('performed_at', { ascending: false }),
      supabase.from('cycling_doses').select('*').eq('tank_id', tankId).order('dosed_at', { ascending: false }),
    ]);

    if (tankRes.error || !tankRes.data) {
      router.push('/dashboard');
      return;
    }

    setTank(tankRes.data);
    setTests(testsRes.data ?? []);
    setLivestock(livestockRes.data ?? []);
    setLogs(logsRes.data ?? []);
    setDoses(dosesRes.data ?? []);
    setLoading(false);
  }, [tankId, supabase, router]);

  useEffect(() => {
    // loadAll ne fait que déclencher des fetch réseau puis setState dans leurs
    // callbacks : c'est le point d'entrée normal du chargement de la page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  if (loading || !tank) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Chargement…</div>;
  }

  const health = computeHealthScore(tank, livestock, tests[0] ?? null);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'apercu', label: 'Aperçu' },
    { key: 'parametres', label: "Paramètres d'eau" },
    { key: 'cyclage', label: 'Mise en eau & cyclage' },
    { key: 'peuplement', label: 'Peuplement' },
    { key: 'plantes', label: 'Plantes' },
    { key: 'entretien', label: 'Entretien' },
    { key: 'assistant', label: 'Assistant IA' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft size={16} /> Mes bacs
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{tank.name}</h1>
              <p className="text-sm text-slate-500">
                {tank.volume_liters} L · {tank.water_type === 'freshwater' ? 'eau douce' : tank.water_type === 'saltwater' ? 'eau de mer' : 'eau saumâtre'}
              </p>
            </div>
            <button
              onClick={() => setTab('assistant')}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Sparkles size={16} /> Assistant IA
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'apercu' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <HealthScoreCard health={health} />
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-slate-900">Résumé</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>
                    Cyclage :{' '}
                    {tank.cycling_status === 'cycled'
                      ? 'terminé'
                      : tank.cycling_status === 'cycling'
                        ? 'en cours'
                        : 'pas encore démarré'}
                  </li>
                  <li>{livestock.reduce((s, l) => s + l.quantity, 0)} individus au peuplement</li>
                  <li>{tests.length} test{tests.length > 1 ? 's' : ''} enregistré{tests.length > 1 ? 's' : ''}</li>
                  <li>{logs.length} intervention{logs.length > 1 ? 's' : ''} au journal</li>
                </ul>
              </div>
            </div>
            <PopulationOverview tank={tank} livestock={livestock} />
          </div>
        )}
        {tab === 'parametres' && <WaterTestsPanel tankId={tankId} tests={tests} onUpdated={loadAll} />}
        {tab === 'cyclage' && <CyclingPanel tank={tank} tests={tests} doses={doses} onUpdated={loadAll} />}
        {tab === 'peuplement' && (
          <div className="space-y-6">
            <StockingCalculator tank={tank} livestock={livestock} />
            <LivestockPanel
              tankId={tankId}
              livestock={livestock}
              onUpdated={loadAll}
              categories={['fish', 'invertebrate', 'coral']}
            />
          </div>
        )}
        {tab === 'plantes' && (
          <LivestockPanel
            tankId={tankId}
            livestock={livestock}
            onUpdated={loadAll}
            categories={['plant']}
            lockedCategory="plant"
            title="Ajouter une plante"
            listTitle="Plantes du bac"
          />
        )}
        {tab === 'entretien' && <MaintenancePanel tank={tank} tankId={tankId} logs={logs} onUpdated={loadAll} />}
        {tab === 'assistant' && <AiAssistantPanel tankId={tankId} />}
      </main>
    </div>
  );
}
