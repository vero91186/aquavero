// Appel côté client de la recherche automatique de photo (voir
// src/lib/photo-lookup.ts). Ne lève jamais d'erreur : renvoie null si rien
// n'est trouvé, pour ne jamais bloquer l'ajout d'un élément.
export async function fetchAutoPhoto(query: string): Promise<string | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch('/api/ai/find-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.photo_url ?? null;
  } catch {
    return null;
  }
}
