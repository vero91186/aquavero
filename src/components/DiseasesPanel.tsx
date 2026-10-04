'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AiDiagnostic } from '@/types/database';
import { DiagnoseMode } from '@/components/AiAssistantPanel';
import {
  DISEASES,
  GENERAL_RULES,
  GROUP_LABELS,
  findDisease,
  KIND_LABELS,
  SEVERITY_LABELS,
  searchDiseases,
  type Disease,
  type DiseaseGroup,
  type DiseaseSeverity,
} from '@/lib/diseases';
import { AlertTriangle, ChevronDown, Search, ShieldAlert, Stethoscope } from 'lucide-react';

type Sub = 'scanner' | 'liste' | 'historique';

const SEVERITY_BADGE: Record<DiseaseSeverity, string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function DiseasesPanel({
  tankId,
  onGoToPrograms,
}: {
  tankId: string;
  // Ouvre l'onglet Entretien, où l'on crée un programme de traitement avec début et fin.
  onGoToPrograms?: () => void;
}) {
  const [sub, setSub] = useState<Sub>('scanner');
  const [openId, setOpenId] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const tabs: { key: Sub; label: string }[] = [
    { key: 'scanner', label: 'Scanner un symptôme' },
    { key: 'liste', label: 'Liste des maladies' },
    { key: 'historique', label: 'Historique' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              sub === t.key ? 'bg-teal-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'scanner' && (
        <DiagnoseMode
          tankId={tankId}
          onOpenDisease={(id) => {
            setOpenId(id);
            setSub('liste');
          }}
          onDone={() => setHistoryKey((k) => k + 1)}
        />
      )}
      {sub === 'liste' && <DiseaseList openId={openId} setOpenId={setOpenId} onGoToPrograms={onGoToPrograms} />}
      {sub === 'historique' && <History tankId={tankId} refreshKey={historyKey} onOpenDisease={(id) => { setOpenId(id); setSub('liste'); }} />}
    </div>
  );
}

function DiseaseList({
  openId,
  setOpenId,
  onGoToPrograms,
}: {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onGoToPrograms?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<DiseaseGroup | 'all'>('all');
  const list = searchDiseases(query).filter((d) => group === 'all' || d.group === group);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un symptôme ou une maladie (points blancs, nageoires, mue…)"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['all', 'fish', 'invertebrate', 'plant', 'water'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                group === g ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {g === 'all' ? `Toutes (${DISEASES.length})` : GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-slate-800">Avant tout traitement</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
          {GENERAL_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>

      {list.length === 0 && <p className="text-sm text-slate-400">Aucune maladie ne correspond à cette recherche.</p>}

      {list.map((d) => (
        <DiseaseCard key={d.id} d={d} open={openId === d.id} onToggle={() => setOpenId(openId === d.id ? null : d.id)} onGoToPrograms={onGoToPrograms} />
      ))}

      <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        Ces fiches sont des repères d&apos;aquariophilie, pas un avis vétérinaire. Pour une maladie grave ou qui ne cède pas,
        demande l&apos;avis d&apos;un vétérinaire pour poissons ou d&apos;un aquariophile expérimenté.
      </p>
    </div>
  );
}

function DiseaseCard({
  d,
  open,
  onToggle,
  onGoToPrograms,
}: {
  d: Disease;
  open: boolean;
  onToggle: () => void;
  onGoToPrograms?: () => void;
}) {
  return (
    <article className={`rounded-2xl border bg-white ${open ? 'border-teal-300' : 'border-slate-200'}`}>
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{d.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${SEVERITY_BADGE[d.severity]}`}>
              Gravité {SEVERITY_LABELS[d.severity].toLowerCase()}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{KIND_LABELS[d.kind]}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{GROUP_LABELS[d.group]}</span>
            {d.contagious && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">Contagieuse</span>}
          </div>
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4 text-sm">
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">Cause : </span>
            {d.cause}
          </p>
          <div>
            <p className="font-medium text-slate-800">Symptômes</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-600">
              {d.symptoms.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-800">
              Traitement{d.duration ? <span className="font-normal text-slate-500"> · durée habituelle : {d.duration}</span> : null}
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5 text-slate-600">
              {d.treatment.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          {d.caution && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {d.caution}
            </p>
          )}
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">Prévention : </span>
            {d.prevention}
          </p>
          {onGoToPrograms && d.group !== 'plant' && (
            <button
              type="button"
              onClick={onGoToPrograms}
              className="flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100"
            >
              <Stethoscope size={13} /> Programmer le traitement (début et fin) dans Entretien
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function History({
  tankId,
  refreshKey,
  onOpenDisease,
}: {
  tankId: string;
  refreshKey: number;
  onOpenDisease: (id: string) => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<AiDiagnostic[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('ai_diagnostics')
      .select('*')
      .eq('tank_id', tankId)
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data ?? []) as AiDiagnostic[]);
  }, [supabase, tankId]);

  useEffect(() => {
    // Chargement depuis Supabase : le setState se fait après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  if (items === null) return <p className="text-sm text-slate-400">Chargement…</p>;
  if (items.length === 0)
    return <p className="text-sm text-slate-400">Aucun scan pour l&apos;instant. Décris un symptôme ou envoie une photo dans l&apos;onglet Scanner.</p>;

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const sev = (it.severity ?? 'low') as DiseaseSeverity;
        return (
          <div key={it.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            {it.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{it.likely_condition}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[sev]}`}>
                  {SEVERITY_LABELS[sev]}
                </span>
                <span className="text-xs text-slate-400">{new Date(it.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {it.input_description && <p className="mt-0.5 text-xs text-slate-500">« {it.input_description} »</p>}
              {it.recommended_actions?.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">{it.recommended_actions.slice(0, 2).join(' · ')}</p>
              )}
              <HistoryLink condition={it.likely_condition} onOpen={onOpenDisease} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryLink({ condition, onOpen }: { condition: string; onOpen: (id: string) => void }) {
  const d = findDisease(condition);
  if (!d) return null;
  return (
    <button type="button" onClick={() => onOpen(d.id)} className="mt-1 text-xs text-teal-700 underline">
      Voir la fiche : {d.name}
    </button>
  );
}
