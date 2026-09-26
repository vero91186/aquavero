'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { HardscapeItem, HardscapeKind } from '@/types/database';
import { fetchAutoPhoto } from '@/lib/find-photo-client';
import { PhotoUpload } from '@/components/PhotoUpload';
import { GoogleSearchLink } from '@/components/GoogleSearchLink';
import { Trash2, Pencil, Check, X, Search, Loader2, Sparkles } from 'lucide-react';

const KIND_LABELS: Record<HardscapeKind, string> = {
  rock: 'Roche',
  wood: 'Racine / bois',
};

export function HardscapePanel({
  tankId,
  items,
  onUpdated,
}: {
  tankId: string;
  items: HardscapeItem[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [kind, setKind] = useState<HardscapeKind>('rock');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ kind: HardscapeKind; name: string; quantity: string; notes: string }>({
    kind: 'rock',
    name: '',
    quantity: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<{ water_effect: string; preparation: string; note: string } | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  async function handleResearch() {
    if (!name.trim()) return;
    setResearching(true);
    setResearchError(null);
    setResearch(null);
    try {
      const res = await fetch('/api/ai/research-hardscape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResearch(data);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : 'Erreur de recherche IA');
    } finally {
      setResearching(false);
    }
  }

  function applyResearchToNotes() {
    if (!research) return;
    const summary = [research.water_effect, research.preparation].filter(Boolean).join(' — ');
    setNotes(summary);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Recherche automatique d'une photo sur internet à partir du nom (le
    // mot-clé "aquarium" améliore la pertinence des résultats).
    const photoUrl = await fetchAutoPhoto(`${name} aquarium`);
    const aiSummary = research
      ? [research.water_effect, research.preparation, research.note].filter(Boolean).join(' — ')
      : null;

    await supabase.from('hardscape_items').insert({
      tank_id: tankId,
      user_id: user.id,
      kind,
      name,
      quantity: parseInt(quantity, 10) || 1,
      notes: notes || null,
      photo_url: photoUrl,
      ai_summary: aiSummary,
    });
    setSaving(false);
    setName('');
    setQuantity('1');
    setNotes('');
    setResearch(null);
    onUpdated();
  }

  async function handleDelete(id: string) {
    await supabase.from('hardscape_items').delete().eq('id', id);
    onUpdated();
  }

  async function handlePhotoChange(id: string, url: string | null) {
    await supabase.from('hardscape_items').update({ photo_url: url }).eq('id', id);
    onUpdated();
  }

  function startEdit(item: HardscapeItem) {
    setEditingId(item.id);
    setEditForm({ kind: item.kind, name: item.name, quantity: String(item.quantity), notes: item.notes ?? '' });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    await supabase
      .from('hardscape_items')
      .update({
        kind: editForm.kind,
        name: editForm.name,
        quantity: parseInt(editForm.quantity, 10) || 1,
        notes: editForm.notes || null,
      })
      .eq('id', id);
    setSavingEdit(false);
    setEditingId(null);
    onUpdated();
  }

  const rocks = items.filter((i) => i.kind === 'rock');
  const woods = items.filter((i) => i.kind === 'wood');

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Ajouter une roche ou une racine</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as HardscapeKind)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {(Object.keys(KIND_LABELS) as HardscapeKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
          <input
            required
            placeholder="Nom (ex. Roche de lave, Racine de tourbière)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setResearch(null);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <input
            type="number"
            min="1"
            placeholder="Quantité"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-4"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={handleResearch}
            disabled={researching || !name.trim()}
            className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800 disabled:opacity-50"
          >
            {researching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Rechercher &quot;{name || '...'}&quot; avec l&apos;IA (effet sur l&apos;eau, préparation)
          </button>
          {researching && (
            <span className="text-xs text-slate-400">Peut prendre quelques secondes si l&apos;IA est très sollicitée.</span>
          )}
          <GoogleSearchLink query={`${name} aquarium`} />
        </div>
        {researchError && <p className="mt-2 text-xs text-red-600">{researchError}</p>}

        {research && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-600" />
              <p className="text-sm font-medium text-slate-800">Fiche IA — {name}</p>
            </div>
            {research.water_effect && <p className="text-xs text-slate-600">Effet sur l&apos;eau : {research.water_effect}</p>}
            {research.preparation && <p className="text-xs text-slate-600">Préparation : {research.preparation}</p>}
            {research.note && <p className="text-xs text-slate-500">{research.note}</p>}
            <button
              type="button"
              onClick={applyResearchToNotes}
              className="mt-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Reprendre dans les notes
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Ajout…' : 'Ajouter'}
        </button>
      </form>

      {([
        ['rock', 'Roches', rocks],
        ['wood', 'Racines et bois', woods],
      ] as const).map(([, label, list]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-slate-900">{label}</h3>
          <div className="space-y-2">
            {list.map((item) =>
              editingId === item.id ? (
                <div key={item.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-[10rem] flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-600">Nom</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="min-w-[10rem] flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-600">Notes</label>
                    <input
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(item.id)}
                      disabled={savingEdit}
                      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                      title="Enregistrer"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" title="Annuler">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <PhotoUpload
                      photoUrl={item.photo_url}
                      folder="hardscape"
                      size="sm"
                      onChange={(url) => handlePhotoChange(item.id, url)}
                    />
                    <div>
                      <span className="font-medium text-slate-800">
                        {item.quantity}× {item.name}
                      </span>
                      {item.notes && <span className="ml-2 text-xs text-slate-400">{item.notes}</span>}
                      {item.ai_summary && (
                        <div className="mt-0.5 flex items-start gap-1 text-xs text-teal-600">
                          <Sparkles size={11} className="mt-0.5 shrink-0" /> {item.ai_summary}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-teal-600" title="Modifier">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            )}
            {list.length === 0 && <p className="text-sm text-slate-400">Rien d&apos;enregistré pour l&apos;instant</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
