'use client';

import { useState } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import {
  SUPPLIER_GROUPS,
  SUPPLIER_NAME,
  SUPPLIER_SNAPSHOT_DATE,
  SUPPLIER_TO_AVOID,
} from '@/lib/supplier-catalog';

// Liste des espèces compatibles proposées par un grossiste. Un clic sur une
// espèce la remonte dans le formulaire d'ajout (qui complète via le catalogue).
export function SupplierShelf({ onPick }: { onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hideOut, setHideOut] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <Store size={18} className="text-teal-600" />
          Disponible chez {SUPPLIER_NAME}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">
            Espèces compatibles avec un bac planté de 150 L, KH 6 (relevé du{' '}
            {new Date(SUPPLIER_SNAPSHOT_DATE).toLocaleDateString('fr-FR')}). <span className="font-medium">*</span> = préfère une eau plus
            douce. Grossiste réservé aux professionnels.
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={hideOut} onChange={(e) => setHideOut(e.target.checked)} />
            Masquer les ruptures
          </label>
          {SUPPLIER_GROUPS.map((g) => {
            const list = g.species.filter((sp) => !(hideOut && sp.outOfStock));
            if (list.length === 0) return null;
            const isOpen = openGroup === g.id;
            return (
              <div key={g.id} className="rounded-lg border border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : g.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-800"
                >
                  <span>
                    {g.label} <span className="text-xs font-normal text-slate-400">({list.length})</span>
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    {g.note && <p className="mb-2 text-xs text-amber-700">{g.note}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((sp) => (
                        <button
                          key={sp.name}
                          type="button"
                          onClick={() => onPick(sp.name)}
                          className={`rounded-full border px-2.5 py-1 text-xs hover:bg-teal-50 ${
                            sp.outOfStock ? 'border-slate-200 text-slate-400 line-through' : 'border-teal-200 text-slate-700'
                          }`}
                          title={sp.outOfStock ? 'En rupture le jour du relevé' : sp.softWater ? 'Préfère une eau plus douce' : undefined}
                        >
                          {sp.name}
                          {sp.softWater ? '*' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p className="mb-1 font-medium">À éviter dans ce bac</p>
            {SUPPLIER_TO_AVOID.map((a) => (
              <p key={a.label}>
                <span className="font-medium">{a.label}</span> : {a.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
