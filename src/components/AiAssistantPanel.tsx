'use client';

import { useState } from 'react';
import { fileToBase64 } from '@/lib/image';
import { Send, Camera, Loader2, Stethoscope, AlertTriangle, ScanSearch, ListChecks } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Modérée',
  high: 'Élevée',
  urgent: 'Urgente',
};

export function AiAssistantPanel({
  tankId,
  initialMode,
  onUpdated,
}: {
  tankId: string;
  initialMode?: 'chat' | 'diagnose' | 'scan';
  // Rafraîchit les données du bac (ex. journal) après un scan complet, qui
  // y ajoute automatiquement une entrée "Observation".
  onUpdated?: () => void;
}) {
  const [mode, setMode] = useState<'chat' | 'diagnose' | 'scan'>(initialMode ?? 'chat');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode('chat')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === 'chat' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Discuter
        </button>
        <button
          onClick={() => setMode('diagnose')}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === 'diagnose' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Stethoscope size={14} /> Check-up d&apos;un symptôme
        </button>
        <button
          onClick={() => setMode('scan')}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === 'scan' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <ScanSearch size={14} /> Scan complet du bac
        </button>
      </div>

      {mode === 'chat' ? (
        <ChatMode tankId={tankId} />
      ) : mode === 'diagnose' ? (
        <DiagnoseMode tankId={tankId} />
      ) : (
        <ScanMode tankId={tankId} onUpdated={onUpdated} />
      )}
    </div>
  );
}

function ChatMode({ tankId }: { tankId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = input;
    setMessages((m) => [...m, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankId, message: userMessage, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Pose une question sur ton bac — l&apos;assistant connaît ton peuplement et tes derniers relevés.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <Loader2 className="animate-spin text-teal-500" size={18} />}
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex. Mes nitrates sont à 30, c'est grave ?"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

interface DiagnosticResult {
  likely_condition: string;
  confidence: number;
  severity: string;
  recommended_actions: string[];
  vet_referral: boolean;
}

function DiagnoseMode({ tankId }: { tankId: string }) {
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ diagnostic: DiagnosticResult; explanation: string } | null>(null);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mimeType } = await fileToBase64(file);
    setImageBase64(base64);
    setImageMimeType(mimeType);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() && !imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId,
          description: description || undefined,
          imageBase64: imageBase64 || undefined,
          imageMimeType: imageMimeType || undefined,
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

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm text-slate-500">
          Décris ce que tu observes (comportement, aspect, nageoires…) et/ou ajoute une photo.
        </p>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ex. Un Corydoras reste immobile au fond, nageoires pincées depuis hier"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <div className="mt-3 flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50">
            <Camera size={16} /> Ajouter une photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </label>
          {imagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Aperçu" className="h-14 w-14 rounded-lg object-cover" />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? 'Analyse…' : 'Lancer le check-up'}
        </button>
      </form>

      {result && (
        <div className={`rounded-2xl border p-5 ${SEVERITY_STYLES[result.diagnostic.severity]}`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{result.diagnostic.likely_condition}</h3>
            <span className="text-xs font-medium">
              Confiance : {Math.round(result.diagnostic.confidence * 100)}%
            </span>
          </div>
          <p className="mt-1 text-sm">Gravité estimée : {SEVERITY_LABELS[result.diagnostic.severity]}</p>
          <p className="mt-3 text-sm">{result.explanation}</p>

          {result.diagnostic.recommended_actions?.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm">
              {result.diagnostic.recommended_actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          )}

          {result.diagnostic.vet_referral && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/60 p-3 text-sm font-medium">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Ce check-up est un point de départ, pas un diagnostic médical : consulte un vétérinaire
              ou un spécialiste aquariophile pour confirmer et traiter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CheckupResult {
  overall_assessment: string;
  issues: { label: string; severity: string; detail: string }[];
  todos: string[];
}

function ScanMode({ tankId, onUpdated }: { tankId: string; onUpdated?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckupResult | null>(null);

  async function runScan() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/tank-checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tankId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <ScanSearch size={18} className="text-teal-600" />
          <h3 className="font-semibold text-slate-900">Scan complet du bac</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          L&apos;IA passe en revue le cyclage, le peuplement et la charge biologique, les derniers
          paramètres d&apos;eau, l&apos;historique d&apos;entretien et les produits proches de la
          péremption pour repérer les problèmes et lister ce qu&apos;il y a à faire — sans besoin de
          photo ni de description. Le résultat est aussi ajouté au journal (onglet Entretien) comme
          observation.
        </p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={runScan}
          disabled={loading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
          {loading ? 'Analyse en cours…' : 'Lancer le scan'}
        </button>
        {loading && (
          <p className="mt-2 text-xs text-slate-400">Peut prendre quelques secondes si l&apos;IA est très sollicitée.</p>
        )}
      </div>

      {result && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-2 font-semibold text-slate-900">Évaluation générale</h3>
            <p className="text-sm text-slate-700">{result.overall_assessment}</p>
          </div>

          {result.issues?.length > 0 && (
            <div className="space-y-2">
              {result.issues.map((issue, i) => (
                <div key={i} className={`rounded-2xl border p-4 ${SEVERITY_STYLES[issue.severity] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{issue.label}</span>
                    <span className="shrink-0 text-xs font-medium">{SEVERITY_LABELS[issue.severity] ?? issue.severity}</span>
                  </div>
                  <p className="mt-1 text-sm">{issue.detail}</p>
                </div>
              ))}
            </div>
          )}

          {result.todos?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2">
                <ListChecks size={16} className="text-teal-600" />
                <h3 className="font-semibold text-slate-900">À faire</h3>
              </div>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                {result.todos.map((todo, i) => (
                  <li key={i}>{todo}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
