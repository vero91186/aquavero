// Recherche automatique d'une photo sur internet à partir d'un nom (espèce,
// produit, roche, racine...). Aucune clé API requise.
//
// Historique : une première version s'appuyait uniquement sur l'API
// Wikipédia/Wikimedia, qui s'est révélée bloquer ou fortement limiter les
// requêtes automatisées ("You are making too many requests to the API"),
// même avec un en-tête User-Agent correct — un souci connu des hébergeurs
// cloud partagés (Vercel compris). On utilise donc en priorité deux sources
// plus tolérantes aux appels serveur à serveur, et Wikipédia seulement en
// tout dernier repli.
const USER_AGENT =
  "AquaTrackAI/1.0 (application personnelle de suivi d'aquarium; contact: vpastout@gmail.com)";

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

interface INatTaxon {
  default_photo?: { medium_url?: string; square_url?: string } | null;
}

// iNaturalist : base collaborative de photos d'espèces (faune/flore), très
// bien fournie pour les poissons, invertébrés, plantes et coraux d'aquarium
// via leur nom scientifique ou commun.
async function searchINaturalist(query: string): Promise<string | null> {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=1`;
  const data = (await fetchJson(url)) as { results?: INatTaxon[] } | null;
  const taxon = data?.results?.[0];
  return taxon?.default_photo?.medium_url ?? taxon?.default_photo?.square_url ?? null;
}

interface OpenverseImage {
  url?: string;
  thumbnail?: string;
}

// Openverse : moteur de recherche d'images libres de droits (Flickr, musées,
// Wikimedia Commons...), utile en repli large pour le matériel, les produits
// et les éléments de décor qui n'ont pas de fiche espèce.
async function searchOpenverse(query: string): Promise<string | null> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1`;
  const data = (await fetchJson(url)) as { results?: OpenverseImage[] } | null;
  const img = data?.results?.[0];
  return img?.url ?? img?.thumbnail ?? null;
}

interface WikiPage {
  original?: { source?: string };
  thumbnail?: { source?: string };
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

// Renvoie l'URL d'une image trouvée sur internet pour ce nom, ou null si rien
// de pertinent n'a été trouvé. Ne lève jamais d'erreur (best-effort) : un
// échec de recherche ne doit jamais bloquer l'ajout d'un élément.
export async function findPhotoOnWeb(query: string): Promise<string | null> {
  const clean = query.trim();
  if (!clean) return null;

  const inat = await searchINaturalist(clean);
  if (inat) return inat;

  const openverse = await searchOpenverse(clean);
  if (openverse) return openverse;

  const fr = await searchWikipediaImage(clean, 'fr');
  if (fr) return fr;
  return searchWikipediaImage(clean, 'en');
}
