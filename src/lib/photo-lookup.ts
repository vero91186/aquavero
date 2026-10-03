// Recherche automatique d'une photo sur internet à partir d'un nom (espèce,
// produit, roche, racine...). Le type d'élément (`kind`) décide de la source,
// car une même source ne convient pas à tout : une base d'espèces n'a rien à
// faire avec un produit du commerce.
//
// Principe de précision : mieux vaut ne PAS trouver de photo (l'utilisateur
// peut en ajouter une à la main) que d'en afficher une qui ne correspond pas.
// Chaque résultat est donc recoupé avec le nom cherché avant d'être accepté.
//
// Historique : l'API Wikipédia/Wikimedia bloque ou limite fortement les
// requêtes automatisées depuis les hébergeurs cloud partagés (Vercel compris) ;
// elle ne sert donc qu'en repli.
import { searchProductPages } from '@/lib/ai/gemini';
import { extractPageImage, isUsablePageHost, nameCovers } from '@/lib/photo-match';

export type PhotoKind = 'species' | 'product' | 'hardscape';

const USER_AGENT =
  "AquaTrackAI/1.0 (application personnelle de suivi d'aquarium; contact: vpastout@gmail.com)";
// Pages marchandes : certaines refusent les User-Agent « robot », on se présente
// donc comme un navigateur pour lire la page produit.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

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
  name?: string;
  preferred_common_name?: string;
  matched_term?: string;
  default_photo?: { medium_url?: string; square_url?: string } | null;
}

// iNaturalist : photos d'espèces (faune/flore). On ne garde un résultat que si
// son nom scientifique ou commun recouvre bien la recherche, en essayant
// d'abord le rang « espèce ».
async function searchINaturalist(query: string): Promise<string | null> {
  for (const rank of ['species', null]) {
    const url =
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=8` +
      (rank ? `&rank=${rank}` : '');
    const data = (await fetchJson(url)) as { results?: INatTaxon[] } | null;
    for (const taxon of data?.results ?? []) {
      const photo = taxon.default_photo?.medium_url ?? taxon.default_photo?.square_url;
      if (!photo) continue;
      if (
        nameCovers(query, taxon.name) ||
        nameCovers(query, taxon.preferred_common_name) ||
        nameCovers(query, taxon.matched_term)
      ) {
        return photo;
      }
    }
  }
  return null;
}

interface OpenverseImage {
  url?: string;
  thumbnail?: string;
  title?: string;
  tags?: { name?: string }[];
}

// Openverse : images libres de droits, utile pour des éléments de décor sans
// fiche espèce. Le titre ou une étiquette doit recouvrir la recherche.
async function searchOpenverse(query: string): Promise<string | null> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10`;
  const data = (await fetchJson(url)) as { results?: OpenverseImage[] } | null;
  for (const img of data?.results ?? []) {
    const link = img.url ?? img.thumbnail;
    if (!link) continue;
    if (nameCovers(query, img.title) || (img.tags ?? []).some((t) => nameCovers(query, t.name))) {
      return link;
    }
  }
  return null;
}

interface WikiPage {
  title?: string;
  original?: { source?: string };
  thumbnail?: { source?: string };
}

async function searchWikipediaImage(query: string, lang: 'fr' | 'en'): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrlimit=5&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=800&format=json&origin=*`;
  const data = (await fetchJson(url)) as { query?: { pages?: Record<string, WikiPage> } } | null;
  const pages = Object.values(data?.query?.pages ?? {});
  for (const page of pages) {
    const img = page.original?.source ?? page.thumbnail?.source;
    if (img && nameCovers(query, page.title)) return img;
  }
  return null;
}

// Vérifie qu'une URL pointe bien vers une image qu'on peut afficher.
async function isReachableImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' },
      signal: AbortSignal.timeout(6000),
    });
    const ok = res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
    await res.body?.cancel();
    return ok;
  } catch {
    return false;
  }
}

// Lit une page produit (fabricant ou revendeur) et en extrait l'image principale.
async function imageFromProductPage(pageUrl: string): Promise<string | null> {
  if (!isUsablePageHost(pageUrl)) return null;
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(7000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    // Après redirections (lien de recherche Google), on vérifie la vraie page.
    if (!isUsablePageHost(res.url)) return null;
    const html = (await res.text()).slice(0, 600_000);
    const image = extractPageImage(html, res.url);
    return image && (await isReachableImage(image)) ? image : null;
  } catch {
    return null;
  }
}

async function findProductPhoto(query: string, hintUrl?: string | null): Promise<string | null> {
  const candidates: string[] = [];
  if (hintUrl) candidates.push(hintUrl);
  // Sans page déjà identifiée par la fiche produit, on la cherche via le web.
  if (!hintUrl) candidates.push(...(await searchProductPages(query)));
  for (const pageUrl of candidates) {
    const image = await imageFromProductPage(pageUrl);
    if (image) return image;
  }
  // Pas de repli sur une banque d'images générique : elle renverrait une
  // photo sans rapport avec ce produit précis.
  return null;
}

// Renvoie l'URL d'une image trouvée sur internet pour ce nom, ou null si rien
// de pertinent n'a été trouvé. Ne lève jamais d'erreur (best-effort) : un
// échec de recherche ne doit jamais bloquer l'ajout d'un élément.
export async function findPhotoOnWeb(
  query: string,
  kind: PhotoKind = 'species',
  hintUrl?: string | null
): Promise<string | null> {
  const clean = query.trim();
  if (!clean) return null;

  try {
    if (kind === 'product') return await findProductPhoto(clean, hintUrl);

    if (kind === 'species') {
      const inat = await searchINaturalist(clean);
      if (inat) return inat;
    } else {
      // Décor : la page déjà identifiée par la fiche IA (si elle existe) illustre
      // ce matériau précis ; sinon banque d'images libres, recoupée avec le nom.
      if (hintUrl) {
        const fromPage = await imageFromProductPage(hintUrl);
        if (fromPage) return fromPage;
      }
      const openverse = await searchOpenverse(clean);
      if (openverse) return openverse;
    }

    const fr = await searchWikipediaImage(clean, 'fr');
    if (fr) return fr;
    return await searchWikipediaImage(clean, 'en');
  } catch {
    return null;
  }
}
