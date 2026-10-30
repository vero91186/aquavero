'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Tank, WaterTest, Livestock, MaintenanceLog, CyclingDose, HardscapeItem, Product, CustomSpecies, FeedingPlanItem } from '@/types/database';
import { computeHealthScore } from '@/lib/health-score';
import { computeShelfLife } from '@/lib/shelf-life';
import { computeReminders } from '@/lib/reminders';
import { TASK_LABELS } from '@/lib/maintenance';
import { HealthScoreCard } from '@/components/HealthScoreCard';
import { WaterTestsPanel } from '@/components/WaterTestsPanel';
import { LivestockPanel } from '@/components/LivestockPanel';
import { MaintenancePanel } from '@/components/MaintenancePanel';
import { MaintenancePlanning } from '@/components/MaintenancePlanning';
import { AiAssistantPanel } from '@/components/AiAssistantPanel';
import { CyclingPanel } from '@/components/CyclingPanel';
import { DensitySimulator } from '@/components/DensitySimulator';
import { PopulationOverview } from '@/components/PopulationOverview';
import { MyFishRecap } from '@/components/MyFishRecap';
import { IntroDatesPlanner } from '@/components/IntroDatesPlanner';
import { ScannerPanel } from '@/components/ScannerPanel';
import { DiseasesPanel } from '@/components/DiseasesPanel';
import { TankPropertiesPanel } from '@/components/TankPropertiesPanel';
import { TreatmentPrograms } from '@/components/TreatmentPrograms';
import { FeedingPlan } from '@/components/FeedingPlan';
import { CrossingChart } from '@/components/CrossingChart';
import { BottomNav, type NavItem } from '@/components/BottomNav';
import { programState, dateKey } from '@/lib/treatment';
import { PlantMap } from '@/components/PlantMap';
import { EquipmentPanel } from '@/components/EquipmentPanel';
import { HardscapePanel } from '@/components/HardscapePanel';
import { ProductsPanel } from '@/components/ProductsPanel';
import type { MaintenanceTaskType, TreatmentProgram } from '@/types/database';
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
  ScanSearch,
  Stethoscope,
} from 'lucide-react';

// Navigation à deux niveaux : quelques sections principales (peu nombreuses,
// pour rester lisible), chacune éventuellement subdivisée en sous-onglets —
// plutôt qu'une seule rangée de 11 onglets à faire défiler.
type Section = 'apercu' | 'bac' | 'eau' | 'peuplement' | 'entretien' | 'maladies' | 'scanner' | 'assistant';
type BacSub = 'proprietes' | 'materiel' | 'hardscape' | 'produits';
type EauSub = 'parametres' | 'cyclage';
type PeuplementSub = 'poissons' | 'simulateur' | 'plantes' | 'croisements';
type EntretienSub = 'planning' | 'nourrissage' | 'traitements' | 'journal';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'apercu', label: 'Aperçu', icon: <LayoutGrid size={15} /> },
  { key: 'bac', label: 'Mon bac', icon: <Box size={15} /> },
  { key: 'eau', label: 'Eau', icon: <Waves size={15} /> },
  { key: 'peuplement', label: 'Peuplement', icon: <Fish size={15} /> },
  { key: 'entretien', label: 'Entretien', icon: <Wrench size={15} /> },
  { key: 'maladies', label: 'Maladies', icon: <Stethoscope size={15} /> },
  { key: 'scanner', label: 'Scanner', icon: <Camera size={15} /> },
  { key: 'assistant', label: 'Assistant IA', icon: <Sparkles size={15} /> },
];

const BAC_SUBS: { key: BacSub; label: string }[] = [
  { key: 'proprietes', label: 'Propriétés' },
  { key: 'materiel', label: 'Matériel' },
  { key: 'hardscape', label: 'Roches & racines' },
  { key: 'produits', label: 'Produits' },
];

const EAU_SUBS: { key: EauSub; label: string }[] = [
  { key: 'parametres', label: "Paramètres d'eau" },
  { key: 'cyclage', label: 'Mise en eau & cyclage' },
];

const PEUPLEMENT_SUBS: { key: PeuplementSub; label: string }[] = [
  { key: 'poissons', label: 'Mes poissons' },
  { key: 'simulateur', label: 'Simulateur' },
  { key: 'plantes', label: 'Plantes' },
  { key: 'croisements', label: 'Croisements' },
];

const ENTRETIEN_SUBS: { key: EntretienSub; label: string }[] = [
  { key: 'planning', label: 'Planning' },
  { key: 'nourrissage', label: 'Nourrissage' },
  { key: 'traitements', label: 'Traitements' },
  { key: 'journal', label: 'Journal' },
];

const SECTION_KEYS: string[] = SECTIONS.map((s) => s.key);
const SUBS_BY_SECTION: Partial<Record<Section, { key: string; label: string }[]>> = {
  bac: BAC_SUBS,
  eau: EAU_SUBS,
  peuplement: PEUPLEMENT_SUBS,
  entretien: ENTRETIEN_SUBS,
};

// Sur téléphone : les rubriques du quotidien dans la barre du bas, le reste sous « Plus ».
const PRIMARY_KEYS: Section[] = ['apercu', 'peuplement', 'eau', 'entretien'];
const MORE_HINTS: Partial<Record<Section, string>> = {
  bac: 'Propriétés, matériel, roches et produits',
  maladies: 'Diagnostic et programmes de traitement',
  scanner: 'Analyser une photo (bandelette, poisson, produit)',
  assistant: 'Poser une question ou lancer un check-up',
};

// L'adresse garde la rubrique et le sous-onglet : le bouton retour du téléphone
// remonte d'un écran et un rechargement ne ramène plus à l'aperçu.
function navQuery(section: Section, sub: string | null): string {
  if (section === 'apercu') return '';
  return `?s=${section}${sub ? `&sub=${sub}` : ''}`;
}

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
  const [programs, setPrograms] = useState<TreatmentProgram[]>([]);
  const [programsUnavailable, setProgramsUnavailable] = useState(false);
  const [feedingItems, setFeedingItems] = useState<FeedingPlanItem[]>([]);
  const [feedingUnavailable, setFeedingUnavailable] = useState(false);
  const [section, setSection] = useState<Section>('apercu');
  const [bacSub, setBacSub] = useState<BacSub>('proprietes');
  const [eauSub, setEauSub] = useState<EauSub>('parametres');
  const [peuplementSub, setPeuplementSub] = useState<PeuplementSub>('poissons');
  const [entretienSub, setEntretienSub] = useState<EntretienSub>('planning');
  const [loading, setLoading] = useState(true);
  const [quickTaskType, setQuickTaskType] = useState<MaintenanceTaskType | null>(null);
  const [assistantMode, setAssistantMode] = useState<'chat' | 'diagnose' | 'scan'>('chat');
  const [navReady, setNavReady] = useState(false);
  const subNavRef = useRef<HTMLDivElement>(null);

  const currentSub: string | null =
    section === 'bac' ? bacSub : section === 'eau' ? eauSub : section === 'peuplement' ? peuplementSub : section === 'entretien' ? entretienSub : null;

  // Lit la rubrique dans l'adresse (ouverture, rechargement, bouton retour).
  const applyUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('s');
    const target = (wanted && SECTION_KEYS.includes(wanted) ? wanted : 'apercu') as Section;
    const subs = SUBS_BY_SECTION[target];
    const wantedSub = params.get('sub');
    const sub = subs ? (subs.find((x) => x.key === wantedSub) ?? subs[0]).key : null;
    setSection(target);
    if (target === 'bac') setBacSub(sub as BacSub);
    if (target === 'eau') setEauSub(sub as EauSub);
    if (target === 'peuplement') setPeuplementSub(sub as PeuplementSub);
    if (target === 'entretien') setEntretienSub(sub as EntretienSub);
    // Adresse incomplète ou inconnue : on la remet d'aplomb sans ajouter d'étape à l'historique.
    const clean = navQuery(target, sub);
    if (clean !== window.location.search) window.history.replaceState(null, '', window.location.pathname + clean);
  }, []);

  useEffect(() => {
    // Lecture de l'adresse au chargement : on aligne l'état local sur un système
    // extérieur (l'URL), c'est le rôle normal d'un effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applyUrl();
    setNavReady(true);
    window.addEventListener('popstate', applyUrl);
    return () => window.removeEventListener('popstate', applyUrl);
  }, [applyUrl]);

  // Chaque changement de rubrique ou de sous-onglet crée une étape d'historique et remonte en haut de page.
  useEffect(() => {
    if (!navReady) return;
    const wanted = navQuery(section, currentSub);
    if (wanted === window.location.search) return;
    window.history.pushState(null, '', window.location.pathname + wanted);
    window.scrollTo({ top: 0 });
  }, [navReady, section, currentSub]);

  // Garde le sous-onglet actif visible dans la rangée qui défile.
  useEffect(() => {
    const box = subNavRef.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  }, [loading, section, currentSub]);

  function selectSection(key: string) {
    if (key === 'assistant') setAssistantMode('chat');
    setSection(key as Section);
  }

  const loadAll = useCallback(async () => {
    const [tankRes, testsRes, livestockRes, logsRes, dosesRes, hardscapeRes, productsRes, customSpeciesRes, programsRes, feedingRes] = await Promise.all([
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
      supabase.from('treatment_programs').select('*').eq('tank_id', tankId).order('start_date', { ascending: false }),
      supabase.from('feeding_plan_items').select('*').eq('tank_id', tankId).order('created_at', { ascending: true }),
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
    setProgramsUnavailable(!!programsRes.error);
    setPrograms((programsRes.data ?? []) as TreatmentProgram[]);
    setFeedingUnavailable(!!feedingRes.error);
    setFeedingItems((feedingRes.data ?? []) as FeedingPlanItem[]);
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
  const todayKey = dateKey(new Date());
  const programAlerts = programs
    .map((p) => ({ p, st: programState(p, todayKey) }))
    .filter(({ st }) => st.phase === 'running' && (st.dueToday || st.overdue.length > 0));

  const subTabsFor: Partial<Record<Section, { key: string; label: string; active: boolean; onClick: () => void }[]>> = {
    bac: BAC_SUBS.map((s) => ({ key: s.key, label: s.label, active: bacSub === s.key, onClick: () => setBacSub(s.key) })),
    eau: EAU_SUBS.map((s) => ({ key: s.key, label: s.label, active: eauSub === s.key, onClick: () => setEauSub(s.key) })),
    entretien: ENTRETIEN_SUBS.map((s) => ({
      key: s.key,
      // Un point d'alerte sur « Traitements » quand une dose est à faire ou en retard.
      label: s.key === 'traitements' && programAlerts.length > 0 ? `Traitements (${programAlerts.length})` : s.label,
      active: entretienSub === s.key,
      onClick: () => setEntretienSub(s.key),
    })),
    peuplement: PEUPLEMENT_SUBS.map((s) => ({
      key: s.key,
      label: s.label,
      active: peuplementSub === s.key,
      onClick: () => setPeuplementSub(s.key),
    })),
  };
  const activeSubTabs = subTabsFor[section];
  const subLabel = SUBS_BY_SECTION[section]?.find((x) => x.key === currentSub)?.label;

  return (
    <div className="min-h-screen">
      <header className="eau text-white">
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-5">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-teal-200 hover:text-white">
            <ArrowLeft size={16} /> Mes bacs
          </Link>
          <div className="mt-3">
            <div className="min-w-0">
              <h1 className="truncate text-3xl leading-tight sm:text-4xl">{tank.name}</h1>
              <p className="mt-1 text-sm text-teal-200">
                <span className="text-lg font-semibold text-sable">{tank.volume_liters} L</span> d&apos;eau réelle
                {tank.gross_volume_liters && (
                  <>
                    , <span className="text-lg font-semibold text-sable">{tank.gross_volume_liters} L</span> bruts
                  </>
                )}
                , {tank.water_type === 'freshwater' ? 'eau douce' : tank.water_type === 'saltwater' ? 'eau de mer' : 'eau saumâtre'}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-teal-200 sm:hidden">
                {SECTIONS.find((x) => x.key === section)?.label}
                {subLabel ? ` · ${subLabel}` : ''}
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="Rubriques" className="mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              aria-current={section === s.key ? 'page' : undefined}
              onClick={() => selectSection(s.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                section === s.key ? 'bg-white text-abysse' : 'text-teal-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </nav>

      </header>

      {activeSubTabs && (
        <div className="sticky top-0 z-30 border-b border-white/10 bg-abysse-2 shadow-sm">
          <div ref={subNavRef} className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
            {activeSubTabs.map((s) => (
              <button
                key={s.key}
                aria-current={s.active ? 'page' : undefined}
                onClick={s.onClick}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition sm:px-3 sm:py-1 sm:text-xs ${
                  s.active ? 'bg-sable text-abysse' : 'text-teal-200 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:pb-6">
        {section === 'apercu' && (
          <div className="space-y-4">
            {(programAlerts.length > 0 || reminders.length > 0 || productsToWatch.length > 0) && (
              <div className="rounded-2xl border border-amber-200 bg-white">
                <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-2.5 text-amber-900">
                  <AlertTriangle size={16} />
                  <h3 className="font-semibold">À surveiller</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {programAlerts.length > 0 && (
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Traitement</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                          {programAlerts.map(({ p, st }) => (
                            <li key={p.id}>
                              <span className="font-medium">{p.name}</span>,{' '}
                              {st.dueToday
                                ? `dose du jour${p.dose_ml ? ` (${p.dose_ml} mL)` : ''}`
                                : `${st.overdue.length} dose(s) en retard`}
                              {' '}(jour {st.dayIndex} sur {st.totalDays})
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          setSection('entretien');
                          setEntretienSub('traitements');
                        }}
                        className="shrink-0 text-xs font-medium text-teal-800 underline hover:text-teal-900"
                      >
                        Ouvrir
                      </button>
                    </div>
                  )}
                  {reminders.length > 0 && (
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rappels d&apos;entretien</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
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
                      </div>
                      <button
                        onClick={() => {
                          setSection('entretien');
                          setEntretienSub('planning');
                        }}
                        className="shrink-0 text-xs font-medium text-teal-800 underline hover:text-teal-900"
                      >
                        Ouvrir
                      </button>
                    </div>
                  )}
                  {productsToWatch.length > 0 && (
                    <div className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Produits</p>
                        <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                          {productsToWatch.map(({ product, shelfLife }) => (
                            <li key={product.id}>
                              <span className="font-medium">{product.name}</span> —{' '}
                              {shelfLife!.level === 'expired'
                                ? `probablement à jeter (dépassé depuis le ${shelfLife!.discardDate.toLocaleDateString('fr-FR')})`
                                : `à utiliser avant le ${shelfLife!.discardDate.toLocaleDateString('fr-FR')} (${shelfLife!.daysLeft} j)`}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          setSection('bac');
                          setBacSub('produits');
                        }}
                        className="shrink-0 text-xs font-medium text-teal-800 underline hover:text-teal-900"
                      >
                        Ouvrir
                      </button>
                    </div>
                  )}
                </div>
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
                  <li>
                    {livestock.filter((l) => l.category !== 'plant').reduce((s, l) => s + l.quantity, 0)} individus
                    au peuplement
                  </li>
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
                      setEntretienSub('journal');
                      setSection('entretien');
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setAssistantMode('scan');
                    setSection('assistant');
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-100"
                >
                  <ScanSearch size={15} /> Scan complet IA
                </button>
              </div>
            </div>
            <PopulationOverview tank={tank} livestock={livestock} />
          </div>
        )}
        {section === 'bac' && bacSub === 'proprietes' && <TankPropertiesPanel tank={tank} onUpdated={loadAll} />}
        {section === 'bac' && bacSub === 'materiel' && <EquipmentPanel tank={tank} onUpdated={loadAll} />}
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
        {section === 'peuplement' && peuplementSub === 'simulateur' && (
          <DensitySimulator
            tankId={tank.id}
            onUpdated={loadAll}
            livestock={livestock}
            netLiters={tank.volume_liters}
            grossLiters={tank.gross_volume_liters ?? null}
            lengthCm={tank.length_cm}
            heightCm={tank.height_cm}
          />
        )}
        {section === 'peuplement' && peuplementSub === 'poissons' && (
          <div className="space-y-6">
            <MyFishRecap tank={tank} livestock={livestock} onOpenSimulator={() => setPeuplementSub('simulateur')} />
            <IntroDatesPlanner livestock={livestock} onUpdated={loadAll} />
            <LivestockPanel
              tankId={tankId}
              livestock={livestock}
              onUpdated={loadAll}
              categories={['fish', 'invertebrate', 'coral']}
              customSpecies={customSpecies}
              tankLiters={tank.gross_volume_liters && tank.gross_volume_liters > 0 ? tank.gross_volume_liters : tank.volume_liters}
              netLiters={tank.volume_liters}
              groupByZone
            />
          </div>
        )}
        {section === 'peuplement' && peuplementSub === 'croisements' && <CrossingChart />}
        {section === 'peuplement' && peuplementSub === 'plantes' && (
          <div className="space-y-6">
          <PlantMap tank={tank} plants={livestock.filter((l) => l.category === 'plant')} onUpdated={loadAll} />
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
          </div>
        )}
        {section === 'entretien' && entretienSub === 'planning' && (
          <MaintenancePlanning
            tankId={tankId}
            livestock={livestock}
            logs={logs}
            tests={tests}
            volumeLiters={tank.volume_liters}
            maintenanceWeekday={tank.maintenance_weekday ?? null}
            onUpdated={loadAll}
            onNote={(t) => {
              setQuickTaskType(t);
              setEntretienSub('journal');
            }}
          />
        )}
        {section === 'entretien' && entretienSub === 'nourrissage' && (
          <FeedingPlan tank={tank} items={feedingItems} logs={logs} livestock={livestock} products={products} unavailable={feedingUnavailable} onUpdated={loadAll} />
        )}
        {section === 'entretien' && entretienSub === 'traitements' && (
          <TreatmentPrograms tank={tank} products={products} programs={programs} unavailable={programsUnavailable} onUpdated={loadAll} />
        )}
        {section === 'entretien' && entretienSub === 'journal' && (
          <MaintenancePanel
            tank={tank}
            tankId={tankId}
            logs={logs}
            onUpdated={loadAll}
            presetTaskType={quickTaskType}
            products={products}
          />
        )}
        {section === 'maladies' && <DiseasesPanel tankId={tankId} onJournalAdded={loadAll} onGoToPrograms={() => {
          setSection('entretien');
          setEntretienSub('traitements');
        }} />}
        {section === 'scanner' && (
          <ScannerPanel
            tankId={tankId}
            onUpdated={loadAll}
            onNavigate={(target) => {
              if (target === 'assistant') {
                setSection('maladies');
              } else if (target === 'plantes') {
                setSection('peuplement');
                setPeuplementSub('plantes');
              } else {
                setSection('peuplement');
                setPeuplementSub('poissons');
              }
            }}
          />
        )}
        {section === 'assistant' && (
          <AiAssistantPanel tankId={tankId} initialMode={assistantMode} onUpdated={loadAll} />
        )}
      </main>

      <BottomNav
        active={section}
        onSelect={selectSection}
        primary={PRIMARY_KEYS.map((k): NavItem => {
          const item = SECTIONS.find((x) => x.key === k)!;
          return { key: item.key, label: item.label, icon: item.icon };
        })}
        more={SECTIONS.filter((x) => !PRIMARY_KEYS.includes(x.key)).map(
          (x): NavItem => ({ key: x.key, label: x.label, icon: x.icon, hint: MORE_HINTS[x.key] })
        )}
      />
    </div>
  );
}
