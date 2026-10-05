'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MaintenanceTaskType } from '@/types/database';
import { BookPlus, Check } from 'lucide-react';

// Ajoute une note au journal d'entretien du bac (type « observation » par
// défaut). Sert à garder la trace de n'importe quelle analyse de l'IA :
// réponse du chat, check-up d'un symptôme, identification, etc.
export function AddToJournal({
  tankId,
  text,
  onAdded,
  taskType = 'observation',
  photo,
  className = '',
}: {
  tankId: string;
  text: string;
  onAdded?: () => void;
  taskType?: MaintenanceTaskType;
  // Photo analysée par l'IA, rattachée à l'entrée du journal si fournie.
  photo?: { base64: string; mimeType: string } | null;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  async function add() {
    setState('saving');
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setState('error');
      return;
    }
    let photoUrl: string | null = null;
    if (photo) {
      const ext = photo.mimeType.split('/')[1] ?? 'jpg';
      const path = `${data.user.id}/journal/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const bytes = Uint8Array.from(atob(photo.base64), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('aquarium-photos')
        .upload(path, bytes, { contentType: photo.mimeType });
      if (!uploadError) photoUrl = supabase.storage.from('aquarium-photos').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('maintenance_logs').insert({
      tank_id: tankId,
      user_id: data.user.id,
      task_type: taskType,
      description: text,
      performed_at: new Date().toISOString(),
      photo_url: photoUrl,
    });
    if (error) {
      setState('error');
      return;
    }
    setState('done');
    onAdded?.();
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === 'saving' || state === 'done'}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
        state === 'done'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : state === 'error'
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
      } ${className}`}
    >
      {state === 'done' ? <Check size={13} /> : <BookPlus size={13} />}
      {state === 'done' ? 'Ajouté au journal' : state === 'error' ? 'Échec, réessayer' : 'Ajouter au journal'}
    </button>
  );
}
