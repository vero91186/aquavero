// Appel côté client de la recherche automatique de photo (voir
// src/lib/photo-lookup.ts). Ne lève jamais d'erreur : renvoie null si rien
// n'est trouvé, pour ne jamais bloquer l'ajout d'un élément.
//
// `kind` choisit la source (espèce, produit du commerce, décor) ; `hintUrl`
// permet de réutiliser la page produit déjà identifiée par la fiche.
export type PhotoKind = 'species' | 'product' | 'hardscape';

export async function fetchAutoPhoto(
  query: string,
  kind: PhotoKind = 'species',
  hintUrl?: string | null
): Promise<string | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch('/api/ai/find-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, kind, hintUrl: hintUrl ?? undefined }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.photo_url ?? null;
  } catch {
    return null;
  }
}
