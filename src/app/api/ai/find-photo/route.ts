import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findPhotoOnWeb, type PhotoKind } from '@/lib/photo-lookup';

const KINDS: PhotoKind[] = ['species', 'product', 'hardscape'];

export async function POST(req: NextRequest) {
  // La recherche de produit déclenche un appel Gemini et des lectures de pages
  // web côté serveur : on la réserve aux utilisateurs connectés.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { query, kind, hintUrl } = await req.json();
  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'Nom manquant pour la recherche de photo.' }, { status: 400 });
  }
  const safeKind: PhotoKind = KINDS.includes(kind) ? kind : 'species';
  const hint = typeof hintUrl === 'string' && /^https?:\/\//i.test(hintUrl) ? hintUrl : null;
  const photo_url = await findPhotoOnWeb(query.trim(), safeKind, hint);
  return NextResponse.json({ photo_url });
}
