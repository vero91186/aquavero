"use client";

import { useEffect, useState } from "react";
import { TOPIC_PHOTO_PAGES, fetchWikipediaLeadImage } from "@/lib/topic-photos";

// Photo d'illustration d'une fiche (maladie ou observation), gardée en mémoire
// et dans le navigateur. Rien ne s'affiche si aucune image n'est trouvée.
const memory = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
// Les requêtes partent l'une après l'autre pour ne pas saturer l'API.
let queue: Promise<unknown> = Promise.resolve();
const STORE = "aquatrack-topic-photos-v1";

function readStore(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function lookup(id: string): Promise<string | null> {
  if (memory.has(id)) return Promise.resolve(memory.get(id) ?? null);
  const stored = readStore()[id];
  if (stored) {
    memory.set(id, stored);
    return Promise.resolve(stored);
  }
  let p = inflight.get(id);
  if (!p) {
    p = (queue = queue.then(
      async () => {
        for (const spec of TOPIC_PHOTO_PAGES[id] ?? []) {
          const url = await fetchWikipediaLeadImage(spec);
          if (url) {
            try {
              const all = readStore();
              all[id] = url;
              localStorage.setItem(STORE, JSON.stringify(all));
            } catch {
              // stockage indisponible
            }
            memory.set(id, url);
            return url;
          }
        }
        memory.set(id, null);
        return null;
      },
      async () => null,
    )) as Promise<string | null>;
    p = p.finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return p;
}

export function TopicPhoto({
  id,
  alt,
  className,
  style,
}: {
  id: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [url, setUrl] = useState<string | null>(() => memory.get(id) ?? null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!TOPIC_PHOTO_PAGES[id]) return;
    let alive = true;
    lookup(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!url || broken) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={className}
      style={style}
    />
  );
}
