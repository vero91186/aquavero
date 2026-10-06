'use client';

import { useState } from 'react';
import { ChevronDown, Store, Plus, Loader2, Check, FlaskConical } from 'lucide-react';
import { SpeciesThumb } from '@/components/SpeciesThumb';
import { SPECIES_CATALOG, SPECIES_ALIASES, schoolMinOf, sexRatioOf, type SpeciesReference } from '@/lib/species-catalog';
import {
  SUPPLIER_GROUPS,
  SUPPLIER_NAME,
  SUPPLIER_SNAPSHOT_DATE,
  SUPPLIER_TO_AVOID,
  type SupplierSpecies,
} from '@/lib/supplier-catalog';

const refBySci = (sci: string): SpeciesReference | undefined =>
  SPECIES_CATALOG.find((c) => c.scientificName === sci);

const fold = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ZONES = { top: 'surface', mid: 'pleine eau', bottom: 'fond' } as const;

// Catalogue des espèces d'un grossiste, avec photos. Un clic ouvre la fiche,
// d'où l'on ajoute l'espèce (et la quantité) directement au peuplement.
export function SupplierShelf({
  onAdd,
}: {
  onAdd: (ref: SpeciesReference, quantity: number) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [hideOut, setHideOut] = useState(false);
  const [search, setSearch] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupplierSpecies | null>(null);
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function select(sp: SupplierSpecies) {
    const ref = refBySci(sp.sci);
    setSelected(sp);
    setQty(String(ref ? (schoolMinOf(ref) ?? 1) : 1));
    setMsg(null);
  }

  async function add() {
    if (!selected) return;
    const ref = refBySci(selected.sci);
    if (!ref) return;
    const n = Math.max(1, parseInt(qty, 10) || 1);
    setBusy(true);
    const err = await onAdd(ref, n);
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: `${n} × ${ref.commonName} ajouté au peuplement.` });
  }

  // Envoie l'espèce au simulateur de densité (hypothétique, rien n'est écrit en base).
  function simulate() {
    if (!selected) return;
    const ref = refBySci(selected.sci);
    if (!ref) return;
    const n = Math.max(1, parseInt(qty, 10) || 1);
    window.dispatchEvent(new CustomEvent('aquatrack:simulate', { detail: { ref, quantity: n } }));
    setMsg({ ok: true, text: `${n} × ${ref.commonName} ajouté à la simulation.` });
    document.getElementById('simulateur-densite')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const selRef = selected ? refBySci(selected.sci) : undefined;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <Store size={18} className="text-teal-600" />
          Catalogue {SUPPLIER_NAME}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">
            Espèces compatibles avec un bac planté de 150 L, KH 6 (relevé du{' '}
            {new Date(SUPPLIER_SNAPSHOT_DATE).toLocaleDateString('fr-FR')}). <span className="font-medium">*</span> = préfère une eau plus
            douce. Grossiste réservé aux professionnels : stocks et prix visibles seulement sur leur site, connecté.
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une espèce (ex. colisa, néon, corydoras)"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={hideOut} onChange={(e) => setHideOut(e.target.checked)} />
            Masquer les ruptures
          </label>

          {selected && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
              <div className="flex gap-3">
                <SpeciesThumb
                  name={selected.name}
                  scientificName={selected.sci}
                  kind={selRef?.category === 'invertebrate' ? 'invertebrate' : 'fish'}
                  size={96}
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-slate-900">
                    {selected.name}
                    {selected.softWater ? '*' : ''}
                    {selected.outOfStock && (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal text-slate-600">rupture</span>
                    )}
                  </p>
                  <p className="text-xs italic text-slate-400">{selected.sci}</p>
                  {selected.varieties && <p className="mt-1 text-xs text-slate-600">Coloris : {selected.varieties}</p>}
                  {selRef && (
                    <p className="mt-1 text-xs text-slate-600">
                      {selRef.adultSizeCm > 0 ? `${selRef.adultSizeCm} cm · ` : ''}
                      {ZONES[selRef.swimZone]} · {selRef.temperament}
                      {schoolMinOf(selRef) ? ` · banc de ${schoolMinOf(selRef)} mini` : ''}
                      {sexRatioOf(selRef) ? ` · ${sexRatioOf(selRef)?.label}` : ''}
                    </p>
                  )}
                  {selected.softWater && <p className="mt-1 text-xs text-amber-700">Préfère une eau plus douce que KH 6.</p>}
                </div>
              </div>
              {selRef ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                    aria-label="Quantité"
                  />
                  <button
                    type="button"
                    onClick={add}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Ajouter au peuplement
                  </button>
                  {(selRef.category === 'fish' || selRef.category === 'invertebrate') && (
                    <button
                      type="button"
                      onClick={simulate}
                      className="flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      <FlaskConical size={15} />
                      Ajouter à la simulation
                    </button>
                  )}
                  {msg && (
                    <span className={`flex items-center gap-1 text-xs ${msg.ok ? 'text-teal-700' : 'text-red-600'}`}>
                      {msg.ok && <Check size={14} />}
                      {msg.text}
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-700">Fiche indisponible dans le catalogue.</p>
              )}
            </div>
          )}

          {SUPPLIER_GROUPS.map((g) => {
            const words = fold(search).split(/\s+/).filter(Boolean);
            const list = g.species.filter((sp) => {
              if (hideOut && sp.outOfStock) return false;
              if (words.length === 0) return true;
              const hay = fold(`${sp.name} ${sp.sci} ${SPECIES_ALIASES[sp.sci] ?? ''} ${sp.varieties ?? ''}`);
              return words.every((w) => hay.includes(w));
            });
            if (list.length === 0) return null;
            const isOpen = words.length > 0 || openGroup === g.id;
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
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {list.map((sp) => {
                        const active = selected?.sci === sp.sci && selected?.name === sp.name;
                        return (
                          <button
                            key={sp.name}
                            type="button"
                            onClick={() => select(sp)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center hover:bg-teal-50 ${
                              active ? 'border-teal-500 bg-teal-50' : 'border-slate-200'
                            } ${sp.outOfStock ? 'opacity-60' : ''}`}
                          >
                            <SpeciesThumb
                              name={sp.name}
                              scientificName={sp.sci}
                              kind={refBySci(sp.sci)?.category === 'invertebrate' ? 'invertebrate' : 'fish'}
                              size={72}
                            />
                            <span className="text-xs font-medium leading-tight text-slate-800">
                              {sp.name}
                              {sp.softWater ? '*' : ''}
                            </span>
                            {sp.outOfStock && <span className="text-[10px] text-slate-500">en rupture</span>}
                          </button>
                        );
                      })}
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
