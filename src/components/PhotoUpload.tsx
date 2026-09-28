'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadPhoto } from '@/lib/photo-upload';
import { Camera, Loader2, X, Link as LinkIcon, Check } from 'lucide-react';

export function PhotoUpload({
  photoUrl,
  folder,
  onChange,
  size = 'md',
}: {
  photoUrl: string | null;
  // Sous-dossier de rangement dans le bucket (ex. "products", "livestock").
  folder: string;
  onChange: (url: string | null) => void | Promise<void>;
  size?: 'sm' | 'md';
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastingUrl, setPastingUrl] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const dim = size === 'sm' ? 'h-16 w-16' : 'h-20 w-20';

  async function handlePasteUrl(e: React.FormEvent) {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) return;
    await onChange(url);
    setUrlValue('');
    setPastingUrl(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const url = await uploadPhoto(supabase, user.id, folder, file);
      await onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi de la photo");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {photoUrl && (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className={`${dim} rounded-lg object-cover`} />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-slate-400 shadow hover:text-red-500"
              title="Retirer la photo"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {photoUrl ? 'Changer' : 'Photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </label>
        <button
          type="button"
          onClick={() => setPastingUrl((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          title="Coller un lien d'image"
        >
          <LinkIcon size={14} />
          Lien
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      {pastingUrl && (
        <form onSubmit={handlePasteUrl} className="flex items-center gap-1">
          <input
            type="url"
            autoFocus
            required
            placeholder="Colle l'URL de l'image ici"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="w-56 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
            title="Valider"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setPastingUrl(false);
              setUrlValue('');
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            title="Annuler"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
