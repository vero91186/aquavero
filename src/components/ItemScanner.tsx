'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fileToBase64 } from '@/lib/image';
import { Camera, Loader2, Check } from 'lucide-react';

interface ItemResult {
  name: string;
  brand_model: string;
  category: string;
  note: string;
}

const KIND_CONFIG = {
  equipment: {
    title: "Identifier l'équipement",
    hint: 'Photographie le matériel (filtre, chauffage, éclairage, pompe...) pour en retrouver la marque, le modèle et les conseils d’entretien.',
    taskType: 'equipment_check' as const,
    journalLabel: "Matériel identifié",
  },
  inventory: {
    title: "Scanner l'inventaire",
    hint: 'Photographie un produit (nourriture, engrais, conditionneur, media filtrant...) pour en retrouver les informations et le dosage.',
    taskType: 'other' as const,
    journalLabel: 'Produit identifié',
  },
};

export function ItemScanner({
  tankId,
  kind,
  onUpdated,
}: {
  tankId: string;
  kind: 'equipment' | 'inventory';
  onUpdated?: () => void;
}) {
  const supabase = createClient();
  const config = KIND_CONFIG[kind];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ItemResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch('/api/ai/identify-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, imageMimeType: mimeType, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.name) {
        setError("Rien d'identifiable sur cette photo — essaie une photo plus nette ou plus rapprochée, avec l'étiquette bien visible.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de reconnaissance photo');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  async function handleAddToJournal() {
    if (!result) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const description = [
      `${config.journalLabel} : ${result.name}`,
      result.brand_model ? `Marque/modèle : ${result.brand_model}` : null,
      result.category ? `Catégorie : ${result.category}` : null,
      result.note ? `Note : ${result.note}` : null,
    ]
      .filter(Boolean)
      .join(' — ');

    await supabase.from('maintenance_logs').insert({
      tank_id: tankId,
      user_id: user.id,
      task_type: config.taskType,
      description,
      performed_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    onUpdated?.();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-1 font-semibold text-slate-900">{config.title}</h3>
      <p className="mb-3 text-sm text-slate-500">{config.hint}</p>

      <label className="flex w-fit cursor-pointer items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {loading ? 'Analyse…' : 'Prendre une photo'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      </label>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-2 rounded-lg bg-teal-50 px-3 py-3">
          <p className="font-medium text-slate-800">{result.name}</p>
          {result.brand_model && <p className="text-sm text-slate-600">Marque/modèle : {result.brand_model}</p>}
          {result.category && <p className="text-sm text-slate-600">Catégorie : {result.category}</p>}
          {result.note && <p className="text-sm text-slate-600">{result.note}</p>}

          <button
            onClick={handleAddToJournal}
            disabled={saving || saved}
            className="mt-2 flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saved ? <Check size={14} /> : null}
            {saved ? 'Ajouté au journal' : saving ? 'Ajout…' : "Ajouter au journal d'entretien"}
          </button>
        </div>
      )}
    </div>
  );
}
