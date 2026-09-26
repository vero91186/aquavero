'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductCategory } from '@/types/database';
import { Search, Loader2, Trash2, Pencil, Check, X, Plus } from 'lucide-react';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  conditioner: "Conditionneur d'eau",
  fertilizer: 'Engrais',
  food: 'Nourriture',
  filter_media: 'Media filtrant',
  test_kit: 'Test / kit',
  other: 'Autre',
};

interface ResearchResult {
  category: ProductCategory;
  dose_info: string;
  dose_ml_per_100l: number | null;
  note: string;
}

export function ProductsPanel({
  tankId,
  products,
  onUpdated,
}: {
  tankId: string;
  products: Product[];
  onUpdated: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; category: ProductCategory; dose_info: string; dose_ml_per_100l: string }>({
    name: '',
    category: 'other',
    dose_info: '',
    dose_ml_per_100l: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/research-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddToList() {
    if (!result) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('products').insert({
      tank_id: tankId,
      user_id: user.id,
      name,
      category: result.category,
      dose_info: result.dose_info || null,
      dose_ml_per_100l: result.dose_ml_per_100l,
      ai_summary: result.note || null,
    });
    setSaving(false);
    setName('');
    setResult(null);
    onUpdated();
  }

  async function handleDelete(id: string) {
    await supabase.from('products').delete().eq('id', id);
    onUpdated();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      category: p.category,
      dose_info: p.dose_info ?? '',
      dose_ml_per_100l: p.dose_ml_per_100l !== null ? String(p.dose_ml_per_100l) : '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    await supabase
      .from('products')
      .update({
        name: editForm.name,
        category: editForm.category,
        dose_info: editForm.dose_info || null,
        dose_ml_per_100l: editForm.dose_ml_per_100l ? parseFloat(editForm.dose_ml_per_100l) : null,
      })
      .eq('id', id);
    setSavingEdit(false);
    setEditingId(null);
    onUpdated();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleResearch} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-1 font-semibold text-slate-900">Rechercher un produit</h3>
        <p className="mb-3 text-sm text-slate-500">
          Entre le nom du produit que tu utilises (conditionneur, engrais, nourriture...) : l&apos;IA
          en fait une fiche (catégorie, dosage) que tu peux ajouter à ta liste.
        </p>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input
            required
            placeholder="ex. Prime Seachem, JBL Ferropol..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {searching ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Fiche générée par IA à partir de ses connaissances générales sur ce type de produit — vérifie
          toujours le dosage indiqué sur l&apos;étiquette de ton produit.
        </p>

        {result && (
          <div className="mt-4 space-y-2 rounded-lg bg-teal-50 px-3 py-3">
            <p className="text-sm font-medium text-slate-800">{CATEGORY_LABELS[result.category]}</p>
            {result.dose_info && <p className="text-sm text-slate-600">{result.dose_info}</p>}
            {result.dose_ml_per_100l !== null && (
              <p className="text-sm text-slate-600">Dosage estimé : {result.dose_ml_per_100l} mL / 100 L</p>
            )}
            {result.note && <p className="text-xs text-slate-500">{result.note}</p>}
            <button
              type="button"
              onClick={handleAddToList}
              disabled={saving}
              className="mt-1 flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Plus size={14} /> {saving ? 'Ajout…' : 'Ajouter à la liste'}
            </button>
          </div>
        )}
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Mes produits</h3>
        <div className="space-y-2">
          {products.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="min-w-[10rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nom</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Catégorie</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as ProductCategory }))}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                {editForm.category === 'conditioner' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Dose (mL/100L)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editForm.dose_ml_per_100l}
                      onChange={(e) => setEditForm((f) => ({ ...f, dose_ml_per_100l: e.target.value }))}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                  </div>
                )}
                <div className="min-w-[10rem] flex-1 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Info dosage</label>
                  <input
                    value={editForm.dose_info}
                    onChange={(e) => setEditForm((f) => ({ ...f, dose_info: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => saveEdit(p.id)}
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
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {CATEGORY_LABELS[p.category]}
                    {p.dose_ml_per_100l !== null ? ` · ${p.dose_ml_per_100l} mL/100L` : ''}
                    {p.dose_info ? ` · ${p.dose_info}` : ''}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-teal-600" title="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
          {products.length === 0 && <p className="text-sm text-slate-400">Aucun produit enregistré pour l&apos;instant</p>}
        </div>
      </div>
    </div>
  );
}
