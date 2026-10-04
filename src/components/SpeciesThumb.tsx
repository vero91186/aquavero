"use client";

import { useEffect, useState } from "react";
import { fetchAutoPhoto } from "@/lib/find-photo-client";
import { nameCovers } from "@/lib/photo-match";

interface INatTaxon {
  name?: string;
  preferred_common_name?: string;
  matched_term?: string;
  default_photo?: { medium_url?: string; square_url?: string } | null;
}

// Première source : iNaturalist directement depuis le navigateur (l'API accepte
// ces appels et ne bloque pas une connexion personnelle, contrairement à un
// serveur d'hébergement). Le nom doit recouvrir la recherche pour être accepté.
async function inatFromBrowser(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=8&rank=species`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: INatTaxon[] };
    for (const t of data.results ?? []) {
      const photo = t.default_photo?.medium_url ?? t.default_photo?.square_url;
      if (
        photo &&
        (nameCovers(query, t.name) ||
          nameCovers(query, t.preferred_common_name) ||
          nameCovers(query, t.matched_term))
      ) {
        return photo;
      }
    }
  } catch {
    // réseau indisponible : on essaie le serveur ensuite
  }
  return null;
}

// Photo d'une espèce, cherchée sur internet à partir du nom scientifique (plus
// fiable que le nom commun). Les résultats sont gardés en mémoire et dans le
// navigateur pour ne chercher qu'une fois par espèce.
const memory = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const STORE = "aquatrack-species-photos-v1";

function readStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
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
    p = inatFromBrowser(query)
      .then((u) => u ?? fetchAutoPhoto(query, "species"))
      .then((url) => {
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
  kind?: "fish" | "invertebrate";
  size?: number;
}) {
  const query = (scientificName && scientificName.trim()) || name;
  const key = query.toLowerCase();
  const [url, setUrl] = useState<string | null | undefined>(() =>
    memory.has(key) ? memory.get(key) : undefined,
  );
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
        {url === undefined ? "" : kind === "invertebrate" ? "🦐" : "🐟"}
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
