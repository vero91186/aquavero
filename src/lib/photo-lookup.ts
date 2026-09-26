// Recherche automatique d'une photo sur internet (Wikipédia / Wikimedia Commons)
// à partir d'un nom (espèce, produit, roche, racine...). Aucune clé API requise.
//
// Important : l'API Wikimedia bloque ou limite fortement les requêtes qui
// n'indiquent pas d'en-tête User-Agent descriptif (politique officielle :
// https://meta.wikimedia.org/wiki/User-Agent_policy). Sans cet en-tête, les
// requêtes échouent souvent silencieusement ("too many requests") même à
// faible volume — d'où l'en-tête ci-dessous sur chaque appel.
const USER_AGENT =
  "AquaTrackAI/1.0 (application personnelle de suivi d'aquarium; contact: vpastout@gmail.com)";

interface WikiPage {
  original?: { source?: string };
  thumbnail?: { source?: string };
}

interface CommonsPage {
  imageinfo?: { thumburl?: string; url?: string }[];
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function searchWikipediaImage(query: string, lang: 'fr' | 'en'): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrlimit=1&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800&format=json&origin=*`;
  const data = (await fetchJson(url)) as { query?: { pages?: Record<string, WikiPage> } } | null;
  const pages = data?.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  return first?.original?.source ?? first?.thumbnail?.source ?? null;
}

// Wikimedia Commons couvre beaucoup plus large que les articles Wikipédia
// (matériel, produits, roches décoratives...), utile en repli quand l'espèce
// ou le produit n'a pas d'article encyclopédique dédié.
async function searchCommonsImage(query: string): Promise<string | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    `filetype:bitmap ${query}`
  )}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
  const data = (await fetchJson(url)) as { query?: { pages?: Record<string, CommonsPage> } } | null;
  const pages = data?.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  const info = first?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}

// Renvoie l'URL d'une image trouvée sur internet pour ce nom, ou null si rien
// de pertinent n'a été trouvé. Ne lève jamais d'erreur (best-effort) : un
// échec de recherche ne doit jamais bloquer l'ajout d'un élément.
export async function findPhotoOnWeb(query: string): Promise<string | null> {
  const clean = query.trim();
  if (!clean) return null;
  const fr = await searchWikipediaImage(clean, 'fr');
  if (fr) return fr;
  const en = await searchWikipediaImage(clean, 'en');
  if (en) return en;
  return searchCommonsImage(clean);
}
