// Recherche automatique d'une photo sur internet (Wikipédia / Wikimedia) à
// partir d'un nom (espèce, produit, roche, racine...). Aucune clé API requise.
// On tente d'abord Wikipédia en français, puis en anglais si rien n'est trouvé
// (utile pour les noms scientifiques ou les marques peu documentées en français).

interface WikiPage {
  original?: { source?: string };
  thumbnail?: { source?: string };
}

async function searchWikipediaImage(query: string, lang: 'fr' | 'en'): Promise<string | null> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrlimit=1&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800&format=json&origin=*`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages as Record<string, WikiPage> | undefined;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    return first?.original?.source ?? first?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

// Renvoie l'URL d'une image trouvée sur internet pour ce nom, ou null si rien
// de pertinent n'a été trouvé. Ne lève jamais d'erreur (best-effort).
export async function findPhotoOnWeb(query: string): Promise<string | null> {
  const clean = query.trim();
  if (!clean) return null;
  const fr = await searchWikipediaImage(clean, 'fr');
  if (fr) return fr;
  return searchWikipediaImage(clean, 'en');
}
