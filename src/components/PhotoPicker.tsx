'use client';

import { Camera, ImagePlus, Loader2 } from 'lucide-react';

// Deux façons d'ajouter une photo à une analyse IA : prendre une photo
// (appareil photo, via l'attribut `capture`) ou importer une image déjà
// présente sur l'appareil (galerie / fichiers, sans `capture`).
export function PhotoPicker({
  onChange,
  multiple,
  loading,
  disabled,
  cameraLabel = 'Prendre une photo',
  importLabel = 'Importer',
  variant = 'button',
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  loading?: boolean;
  disabled?: boolean;
  cameraLabel?: string;
  importLabel?: string;
  variant?: 'button' | 'tile';
}) {
  const cls =
    variant === 'tile'
      ? 'flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-teal-400 hover:text-teal-600'
      : 'flex cursor-pointer items-center gap-1 rounded-lg border border-teal-300 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50';
  const iconSize = variant === 'tile' ? 18 : 16;
  const textCls = variant === 'tile' ? 'text-[10px]' : '';
  const camIcon = loading ? <Loader2 size={iconSize} className="animate-spin" /> : <Camera size={iconSize} />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`${cls} ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        {camIcon}
        <span className={textCls}>{cameraLabel}</span>
        <input type="file" accept="image/*" capture="environment" multiple={multiple} className="hidden" onChange={onChange} />
      </label>
      <label className={`${cls} ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
        <ImagePlus size={iconSize} />
        <span className={textCls}>{importLabel}</span>
        <input type="file" accept="image/*" multiple={multiple} className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}
