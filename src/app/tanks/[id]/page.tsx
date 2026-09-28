'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Tank, WaterTest, Livestock, MaintenanceLog, CyclingDose, HardscapeItem, Product, CustomSpecies } from '@/types/database';
import { computeHealthScore } from '@/lib/health-score';
import { computeShelfLife } from '@/lib/shelf-life';
import { computeReminders } from '@/lib/reminders';
import { TASK_LABELS } from '@/lib/maintenance';
import { HealthScoreCard } from '@/components/HealthScoreCard';
import { WaterTestsPanel } from '@/components/WaterTestsPanel';
import { LivestockPanel } from '@/components/LivestockPanel';
import { MaintenancePanel } from '@/components/MaintenancePanel';
import { AiAssistantPanel } from '@/components/AiAssistantPanel';
import { CyclingPanel } from '@/components/CyclingPanel';
import { StockingCalculator } from '@/components/StockingCalculator';
import { PopulationOverview } from '@/components/PopulationOverview';
import { ScannerPanel } from '@/components/ScannerPanel';
import { TankPropertiesPanel } from '@/components/TankPropertiesPanel';
import { HardscapePanel } from '@/components/HardscapePanel';
import { ProductsPanel } from '@/components/ProductsPanel';
import type { MaintenanceTaskType } from '@/types/database';
import {
  ArrowLeft,
  Sparkles,
  Droplet,
  Utensils,
  FlaskConical,
  SprayCan,
  StickyNote,
  LayoutGrid,
  Box,
  Waves,
  Fish,
  Wrench,
  Camera,
  AlertTriangle,
} from 'lucide-react';

// Navigation à deux niveaux : quelques sections principales (peu nombreuses,
// pour rester lisible), chacune éventuellement subdivisée en sous-onglets —
// plutôt qu'une seule rangée de 11 onglets à faire défiler.
type Section = 'apercu' | 'bac' | 'eau' | 'peuplement' | 'entretien' | 'scanner' | 'assistant';
type BacSub = 'proprietes' | 'hardscape' | 'produits';
type EauSub = 'parametres' | 'cyclage';
type PeuplementSub = 'peuplement' | 'plantes';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'apercu', label: 'Aperçu', icon: <LayoutGrid size={15} /> },
  { key: 'bac', label: 'Mon bac', icon: <Box size={15} /> },
  { key: 'eau', label: 'Eau', icon: <Waves size={15} /> },
  { key: 'peuplement', label: 'Peuplement', icon: <Fish size={15} /> },
  { key: 'entretien', label: 'Entretien', icon: <Wrench size={15} /> },
  { key: 'scanner', label: 'Scanner', icon: <Camera size={15} /> },
  { key: 'assistant', label: 'Assistant IA', icon: <Sparkles size={15} /> },
];

const BAC_SUBS: { key: BacSub; label: string }[] = [
  { key: 'proprietes', label: 'Propriétés' },
  { key: 'hardscape', label: 'Roches & racines' },
  { key: 'produits', label: 'Produits' },
];

const EAU_SUBS: { key: EauSub; label: string }[] = [
  { key: 'parametres', label: "Paramètres d'eau" },
  { key: 'cyclage', label: 'Mise en eau & cyclage' },
];

const PEUPLEMENT_SUBS: { key: PeuplementSub; label: string }[] = [
  { key: 'peuplement', label: 'Poissons & invertébrés' },
  { key: 'plantes', label: 'Plantes' },
];

const QUICK_ACTIONS: { taskType: MaintenanceTaskType; label: string; icon: React.ReactNode }[] = [
  { taskType: 'water_change', label: "Changement d'eau", icon: <Droplet size={14} /> },
  { taskType: 'feeding', label: 'Nourrissage', icon: <Utensils size={14} /> },
  { taskType: 'dosing', label: 'Dosage', icon: <FlaskConical size={14} /> },
  { taskType: 'glass_clean', label: 'Nettoyage', icon: <SprayCan size={14} /> },
  { taskType: 'other', label: 'Note', icon: <StickyNote size={14} /> },
];

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
  const [hardscape, setHardscape] = useState<HardscapeItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customSpecies, setCustomSpecies] = useState<CustomSpecies[]>([]);
  const [section, setSection] = useState<Section>('apercu');
  const [bacSub, setBacSub] = useState<BacSub>('proprietes');
  const [eauSub, setEauSub] = useState<EauSub>('parametres');
  const [peuplementSub, setPeuplementSub] = useState<PeuplementSub>('peuplement');
  const [loading, setLoading] = useState(true);
  const [quickTaskType, setQuickTaskType] = useState<MaintenanceTaskType | null>(null);
  const [assistantMode, setAssistantMode] = useState<'chat' | 'diagnose'>('chat');

  const loadAll = useCallback(async () => {
    const [tankRes, testsRes, livestockRes, logsRes, dosesRes, hardscapeRes, productsRes, customSpeciesRes] = await Promise.all([
      supabase.from('tanks').select('*').eq('id', tankId).single(),
      supabase.from('water_tests').select('*').eq('tank_id', tankId).order('tested_at', { ascending: false }),
      supabase.from('livestock').select('*').eq('tank_id', tankId),
      supabase.from('maintenance_logs').select('*').eq('tank_id', tankId).order('performed_at', { ascending: false }),
      supabase.from('cycling_doses').select('*').eq('tank_id', tankId).order('dosed_at', { ascending: false }),
      supabase.from('hardscape_items').select('*').eq('tank_id', tankId).order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('tank_id', tankId).order('created_at', { ascending: false }),
      // Catalogue d'espèces : commun à tous les bacs de l'utilisateur, pas
      // seulement celui-ci, pour bénéficier des recherches faites ailleurs.
      supabase.from('custom_species').select('*').order('created_at', { ascending: false }),
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
    setHardscape(hardscapeRes.data ?? []);
    setProducts(productsRes.data ?? []);
    setCustomSpecies(customSpeciesRes.data ?? []);
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
  const productsToWatch = products
    .map((p) => ({ product: p, shelfLife: computeShelfLife(p.opened_at, p.shelf_life_days_after_opening) }))
    .filter((p) => p.shelfLife && p.shelfLife.level !== 'ok')
    .sort((a, b) => (a.shelfLife!.daysLeft ?? 0) - (b.shelfLife!.daysLeft ?? 0));
  const reminders = computeReminders(logs);

  const subTabsFor: Partial<Record<Section, { key: string; label: string; active: boolean; onClick: () => void }[]>> = {
    bac: BAC_SUBS.map((s) => ({ key: s.key, label: s.label, active: bacSub === s.key, onClick: () => setBacSub(s.key) })),
    eau: EAU_SUBS.map((s) => ({ key: s.key, label: s.label, active: eauSub === s.key, onClick: () => setEauSub(s.key) })),
    peuplement: PEUPLEMENT_SUBS.map((s) => ({
      key: s.key,
      label: s.label,
      active: peuplementSub === s.key,
      onClick: () => setPeuplementSub(s.key),
    })),
  };
  const activeSubTabs = subTabsFor[section];

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
              onClick={() => {
                setAssistantMode('chat');
                setSection('assistant');
              }}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Sparkles size={16} /> Assistant IA
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                section === s.key ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </nav>

        {activeSubTabs && (
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2">
            {activeSubTabs.map((s) => (
              <button
                key={s.key}
                onClick={s.onClick}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  s.active ? 'bg-teal-50 text-teal-700' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {section === 'apercu' && (
          <div className="space-y-4">
            {reminders.length > 0 && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="mb-1 flex items-center gap-2 text-sky-800">
                  <AlertTriangle size={16} />
                  <h3 className="font-semibold">Rappels d&apos;entretien</h3>
                </div>
                <ul className="space-y-1 text-sm text-sky-700">
                  {reminders.map((r) => (
                    <li key={r.taskType}>
                      <span className="font-medium">{TASK_LABELS[r.taskType]}</span> —{' '}
                      {r.level === 'overdue'
                        ? `en retard depuis le ${r.dueAt.toLocaleDateString('fr-FR')} (${Math.abs(r.daysLeft)} j)`
                        : r.daysLeft === 0
                          ? "aujourd'hui"
                          : `dans ${r.daysLeft} j (le ${r.dueAt.toLocaleDateString('fr-FR')})`}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setSection('entretien')}
                  className="mt-2 text-xs font-medium text-sky-800 underline hover:text-sky-900"
                >
                  Voir l&apos;entretien
                </button>
              </div>
            )}
            {productsToWatch.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-1 flex items-center gap-2 text-amber-800">
                  <AlertTriangle size={16} />
                  <h3 className="font-semibold">Produits à surveiller</h3>
                </div>
                <ul className="space-y-1 text-sm text-amber-700">
                  {productsToWatch.map(({ product, shelfLife }) => (
                    <li key={product.id}>
                      <span className="font-medium">{product.name}</span> —{' '}
                      {shelfLife!.level === 'expired'
                        ? `probablement à jeter (dépassé depuis le ${shelfLife!.discardDate.toLocaleDateString('fr-FR')})`
                        : `à utiliser avant le ${shelfLife!.discardDate.toLocaleDateString('fr-FR')} (${shelfLife!.daysLeft} j)`}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setSection('bac');
                    setBacSub('produits');
                  }}
                  className="mt-2 text-xs font-medium text-amber-800 underline hover:text-amber-900"
                >
                  Voir mes produits
                </button>
              </div>
            )}
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
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.taskType}
                    onClick={() => {
                      setQuickTaskType(a.taskType);
                      setSection('entretien');
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <PopulationOverview tank={tank} livestock={livestock} />
          </div>
        )}
        {section === 'bac' && bacSub === 'proprietes' && <TankPropertiesPanel tank={tank} onUpdated={loadAll} />}
        {section === 'bac' && bacSub === 'hardscape' && (
          <HardscapePanel tankId={tankId} items={hardscape} onUpdated={loadAll} />
        )}
        {section === 'bac' && bacSub === 'produits' && (
          <ProductsPanel tankId={tankId} products={products} onUpdated={loadAll} />
        )}
        {section === 'eau' && eauSub === 'parametres' && (
          <WaterTestsPanel tank={tank} tankId={tankId} tests={tests} onUpdated={loadAll} />
        )}
        {section === 'eau' && eauSub === 'cyclage' && (
          <CyclingPanel tank={tank} tests={tests} doses={doses} onUpdated={loadAll} />
        )}
        {section === 'peuplement' && peuplementSub === 'peuplement' && (
          <div className="space-y-6">
            <StockingCalculator tank={tank} livestock={livestock} />
            <LivestockPanel
              tankId={tankId}
              livestock={livestock}
              onUpdated={loadAll}
              categories={['fish', 'invertebrate', 'coral']}
              customSpecies={customSpecies}
            />
          </div>
        )}
        {section === 'peuplement' && peuplementSub === 'plantes' && (
          <LivestockPanel
            tankId={tankId}
            livestock={livestock}
            onUpdated={loadAll}
            categories={['plant']}
            lockedCategory="plant"
            title="Ajouter une plante"
            listTitle="Plantes du bac"
            customSpecies={customSpecies}
          />
        )}
        {section === 'entretien' && (
          <MaintenancePanel
            tank={tank}
            tankId={tankId}
            logs={logs}
            onUpdated={loadAll}
            presetTaskType={quickTaskType}
            products={products}
          />
        )}
        {section === 'scanner' && (
          <ScannerPanel
            tankId={tankId}
            onUpdated={loadAll}
            onNavigate={(target) => {
              if (target === 'assistant') {
                setAssistantMode('diagnose');
                setSection('assistant');
              } else if (target === 'plantes') {
                setSection('peuplement');
                setPeuplementSub('plantes');
              } else {
                setSection('peuplement');
                setPeuplementSub('peuplement');
              }
            }}
          />
        )}
        {section === 'assistant' && <AiAssistantPanel tankId={tankId} initialMode={assistantMode} />}
      </main>
    </div>
  );
}
