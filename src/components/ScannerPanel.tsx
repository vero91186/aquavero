'use client';

import { useState } from 'react';
import { ItemScanner } from '@/components/ItemScanner';
import { Fish, Leaf, Stethoscope, Wrench, PackageSearch, ChevronRight } from 'lucide-react';

type ScanCard = 'species' | 'plant' | 'health' | 'equipment' | 'inventory';

export function ScannerPanel({
  tankId,
  onNavigate,
  onUpdated,
}: {
  tankId: string;
  onNavigate: (target: 'peuplement' | 'plantes' | 'assistant') => void;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState<ScanCard | null>(null);

  const cards: { key: ScanCard; icon: React.ReactNode; title: string; hint: string; iconBg: string }[] = [
    {
      key: 'species',
      icon: <Fish size={20} className="text-sky-600" />,
      title: "Identifier l'espèce",
      hint: 'Identifier un poisson ou un invertébré par photo',
      iconBg: 'bg-sky-100',
    },
    {
      key: 'plant',
      icon: <Leaf size={20} className="text-emerald-600" />,
      title: 'Identifier la plante',
      hint: "Identifier une plante aquatique et ses besoins d'entretien",
      iconBg: 'bg-emerald-100',
    },
    {
      key: 'inventory',
      icon: <PackageSearch size={20} className="text-amber-600" />,
      title: "Scanner l'inventaire",
      hint: 'Identifier engrais, nourriture, media filtrant et accessoires',
      iconBg: 'bg-amber-100',
    },
    {
      key: 'equipment',
      icon: <Wrench size={20} className="text-violet-600" />,
      title: "Identifier l'équipement",
      hint: "Scanner le matériel pour retrouver marque et modèle",
      iconBg: 'bg-violet-100',
    },
    {
      key: 'health',
      icon: <Stethoscope size={20} className="text-red-600" />,
      title: 'Scan de santé des poissons',
      hint: 'Détecter points blancs, pourriture des nageoires...',
      iconBg: 'bg-red-100',
    },
  ];

  function handleClick(key: ScanCard) {
    if (key === 'species') return onNavigate('peuplement');
    if (key === 'plant') return onNavigate('plantes');
    if (key === 'health') return onNavigate('assistant');
    setOpen(open === key ? null : key);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Scan alimenté par IA</h3>
        <p className="mt-1 text-sm text-slate-500">
          Pointe une photo vers les animaux, plantes ou équipements pour les identifier.
        </p>
      </div>

      <div className="space-y-2">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => handleClick(c.key)}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
              {c.icon}
            </span>
            <span className="flex-1">
              <span className="block font-medium text-slate-800">{c.title}</span>
              <span className="block text-xs text-slate-400">{c.hint}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </button>
        ))}
      </div>

      {open === 'equipment' && <ItemScanner tankId={tankId} kind="equipment" onUpdated={onUpdated} />}
      {open === 'inventory' && <ItemScanner tankId={tankId} kind="inventory" onUpdated={onUpdated} />}
    </div>
  );
}
