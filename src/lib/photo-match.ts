// Fonctions pures utilisées par la recherche de photo : normalisation des noms,
// contrôle de correspondance et extraction de l'image principale d'une page.

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Mots génériques ajoutés aux requêtes (« aquarium ») qui ne doivent pas
// compter dans la comparaison de noms.
const NOISE_WORDS = new Set(['aquarium', 'aquariophilie', 'poisson', 'fish']);

function significantTokens(s: string): string[] {
  return normalizeName(s)
    .split(' ')
    .filter((t) => t.length > 1 && !NOISE_WORDS.has(t));
}

// Vrai si le candidat (nom scientifique, nom commun, titre de page...) désigne
// bien ce qui est cherché : tous les mots significatifs de l'un se retrouvent
// dans l'autre. Évite d'accepter une photo d'une espèce voisine ou sans rapport.
export function nameMatches(query: string, candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const q = significantTokens(query);
  const c = significantTokens(candidate);
  if (q.length === 0 || c.length === 0) return false;
  const cSet = new Set(c);
  const qSet = new Set(q);
  return q.every((t) => cSet.has(t)) || c.every((t) => qSet.has(t));
}

// Variante stricte : le candidat doit contenir tous les mots de la recherche
// (une espèce précise ne doit pas être illustrée par la photo de son genre).
export function nameCovers(query: string, candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const q = significantTokens(query);
  const cSet = new Set(significantTokens(candidate));
  return q.length > 0 && q.every((t) => cSet.has(t));
}

function absolutize(src: string, baseUrl: string): string | null {
  try {
    const u = new URL(src.trim().replace(/&amp;/g, '&'), baseUrl);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const k = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (k !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) return content;
  }
  return null;
}

// Image principale d'une page produit : balises Open Graph / Twitter, puis
// image déclarée dans les données structurées JSON-LD (type Product).
export function extractPageImage(html: string, baseUrl: string): string | null {
  for (const key of ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) {
    const v = metaContent(html, key);
    const abs = v ? absolutize(v, baseUrl) : null;
    if (abs) return abs;
  }
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      const found = findJsonLdImage(JSON.parse(json));
      const abs = found ? absolutize(found, baseUrl) : null;
      if (abs) return abs;
    } catch {
      // JSON-LD invalide : on passe au bloc suivant.
    }
  }
  return null;
}

function findJsonLdImage(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findJsonLdImage(n);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const type = Array.isArray(obj['@type']) ? obj['@type'].join(',') : String(obj['@type'] ?? '');
  if (/product/i.test(type) && obj.image) {
    const img = Array.isArray(obj.image) ? obj.image[0] : obj.image;
    if (typeof img === 'string') return img;
    if (img && typeof img === 'object' && typeof (img as { url?: unknown }).url === 'string') {
      return (img as { url: string }).url;
    }
  }
  if (obj['@graph']) return findJsonLdImage(obj['@graph']);
  return null;
}

const SKIPPED_HOSTS = /(^|\.)(youtube\.com|youtu\.be|facebook\.com|instagram\.com|pinterest\.[a-z.]+|reddit\.com|tiktok\.com|x\.com|twitter\.com)$/i;

export function isUsablePageHost(url: string): boolean {
  try {
    return !SKIPPED_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
