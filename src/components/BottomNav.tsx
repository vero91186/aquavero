'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Ellipsis, X } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Précision affichée sous le nom, dans la feuille « Plus ». */
  hint?: string;
}

// Barre de navigation du bas pour téléphone : les quatre rubriques du quotidien
// sont à portée de pouce, le reste est regroupé sous « Plus ». Masquée dès que
// l'écran est assez large pour afficher les onglets en haut de page.
export function BottomNav({
  primary,
  more,
  active,
  onSelect,
}: {
  primary: NavItem[];
  more: NavItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const moreActive = more.some((m) => m.key === active);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const tab = (isActive: boolean) =>
    `flex min-w-0 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] font-medium transition ${
      isActive ? 'text-sable' : 'text-teal-200 hover:text-white'
    }`;

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-abysse pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(11,59,76,0.25)] sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {primary.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={active === item.key ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
              className={tab(active === item.key)}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active === item.key ? 'bg-white/10' : ''}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={tab(moreActive)}>
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-white/10' : ''}`}>
              <Ellipsis size={20} />
            </span>
            <span>Plus</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Autres rubriques">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg text-abysse">Autres rubriques</h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-2">
              {more.map((item) => {
                const isActive = active === item.key;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        setOpen(false);
                        onSelect(item.key);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        isActive ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{item.label}</span>
                        {item.hint && <span className="block text-sm text-slate-500">{item.hint}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
