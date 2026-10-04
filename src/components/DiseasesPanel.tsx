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
import {
  OBSERVATIONS,
  OBS_GROUP_LABELS,
  OBS_RISK_LABELS,
  findObservation,
  searchObservations,
  type Observation,
  type ObsGroup,
  type ObsRisk,
} from '@/lib/observations';
import { compressImageFile, fileToBase64 } from '@/lib/image';
import { AlertTriangle, Camera, ChevronDown, Search, ShieldAlert, Stethoscope } from 'lucide-react';

type Sub = 'scanner' | 'liste' | 'autre' | 'historique';

const RISK_BADGE: Record<ObsRisk, string> = {
  none: 'bg-emerald-100 text-emerald-800',
  watch: 'bg-amber-100 text-amber-800',
  act: 'bg-red-100 text-red-800',
};

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
    { key: 'autre', label: 'Autre (œufs, algues…)' },
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
      {sub === 'autre' && <OtherTab />}
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

interface ObsResult {
  identification: string;
  category: string;
  confidence: string;
  risk: ObsRisk;
  explanation: string;
  actions: string[];
}

const HINTS = ['Œuf / ponte', 'Algue', 'Bestiole', 'Autre'];

function OtherTab() {
  return (
    <div className="space-y-4">
      <ObservationScan />
      <ObservationList />
    </div>
  );
}

function ObservationScan() {
  const [description, setDescription] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [img, setImg] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObsResult | null>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const c = await compressImageFile(file);
    const { base64, mimeType } = await fileToBase64(c);
    setImg({ base64, mimeType, preview: URL.createObjectURL(c) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() && !img) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/identify-observation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description || undefined,
          hint: hint ?? undefined,
          imageBase64: img?.base64,
          imageMimeType: img?.mimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  const fiche = result ? findObservation(result.identification) : null;

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Une ponte, des petits points sur la vitre, une algue, une bestiole inconnue ? Décris ou photographie, l&apos;IA
          identifie et dit s&apos;il faut agir. Pour un animal malade, utilise « Scanner un symptôme ».
        </p>
        <div className="flex flex-wrap gap-1.5">
          {HINTS.map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => setHint(hint === h ? null : h)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                hint === h ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex : petites billes transparentes sur une feuille d'anubias, filaments verts sur le bois…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            <Camera size={15} /> {img ? 'Changer la photo' : 'Ajouter une photo'}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
          </label>
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
          )}
          <button
            type="submit"
            disabled={loading || (!description.trim() && !img)}
            className="ml-auto rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Analyse…' : 'Identifier'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="space-y-2 rounded-2xl border border-teal-300 bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{result.identification}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_BADGE[result.risk] ?? RISK_BADGE.watch}`}>
              {OBS_RISK_LABELS[result.risk] ?? OBS_RISK_LABELS.watch}
            </span>
            <span className="text-xs text-slate-400">confiance : {result.confidence}</span>
          </div>
          <p className="text-slate-600">{result.explanation}</p>
          {result.actions?.length > 0 && (
            <ol className="list-inside list-decimal space-y-0.5 text-slate-600">
              {result.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          )}
          {fiche && <p className="text-xs text-teal-700">Fiche correspondante : {fiche.name} (voir la liste ci-dessous)</p>}
        </div>
      )}
    </div>
  );
}

function ObservationList() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<ObsGroup | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = searchObservations(query).filter((o) => group === 'all' || o.group === group);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher (œufs, alevins, algues, planaires…)"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['all', 'oeufs', 'algues', 'bestioles', 'autre'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                group === g ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {g === 'all' ? `Toutes (${OBSERVATIONS.length})` : OBS_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 && <p className="text-sm text-slate-400">Aucune fiche ne correspond.</p>}
      {list.map((o: Observation) => {
        const open = openId === o.id;
        return (
          <article key={o.id} className={`rounded-2xl border bg-white ${open ? 'border-teal-300' : 'border-slate-200'}`}>
            <button onClick={() => setOpenId(open ? null : o.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
              <div>
                <p className="font-medium text-slate-900">{o.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${RISK_BADGE[o.risk]}`}>{OBS_RISK_LABELS[o.risk]}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{OBS_GROUP_LABELS[o.group]}</span>
                </div>
              </div>
              <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="space-y-2 border-t border-slate-100 p-4 text-sm text-slate-600">
                <p><span className="font-medium text-slate-800">À quoi ça ressemble : </span>{o.looks}</p>
                <p><span className="font-medium text-slate-800">Ce que c&apos;est : </span>{o.meaning}</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {o.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
