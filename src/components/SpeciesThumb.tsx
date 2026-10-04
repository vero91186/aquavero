'use client';

import { useEffect, useState } from 'react';
import { fetchAutoPhoto } from '@/lib/find-photo-client';

// Photo d'une espèce, cherchée sur internet à partir du nom scientifique (plus
// fiable que le nom commun). Les résultats sont gardés en mémoire et dans le
// navigateur pour ne chercher qu'une fois par espèce.
const memory = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const STORE = 'aquatrack-species-photos-v1';

function readStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}');
  } catch {
    return {};
  }
}

function writeStore(key: string, url: string) {
  try {
    const all = readStore();
    all[key] = url;
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    // stockage indisponible : on garde seulement la mémoire
  }
}

function lookup(key: string, query: string): Promise<string | null> {
  if (memory.has(key)) return Promise.resolve(memory.get(key) ?? null);
  const stored = readStore()[key];
  if (stored) {
    memory.set(key, stored);
    return Promise.resolve(stored);
  }
  let p = inflight.get(key);
  if (!p) {
    p = fetchAutoPhoto(query, 'species').then((url) => {
      memory.set(key, url);
      if (url) writeStore(key, url);
      inflight.delete(key);
      return url;
    });
    inflight.set(key, p);
  }
  return p;
}

export function SpeciesThumb({
  name,
  scientificName,
  kind,
  size = 40,
}: {
  name: string;
  scientificName?: string | null;
  kind?: 'fish' | 'invertebrate';
  size?: number;
}) {
  const query = (scientificName && scientificName.trim()) || name;
  const key = query.toLowerCase();
  const [url, setUrl] = useState<string | null | undefined>(() => (memory.has(key) ? memory.get(key) : undefined));
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let alive = true;
    lookup(key, query).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [key, query]);

  const box = { width: size, height: size };
  if (!url || broken) {
    return (
      <span
        style={box}
        className="flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base"
        aria-hidden
      >
        {url === undefined ? '' : kind === 'invertebrate' ? '🦐' : '🐟'}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      style={box}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-lg object-cover"
    />
  );
}
