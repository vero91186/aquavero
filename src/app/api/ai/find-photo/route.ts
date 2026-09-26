import { NextRequest, NextResponse } from 'next/server';
import { findPhotoOnWeb } from '@/lib/photo-lookup';

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'Nom manquant pour la recherche de photo.' }, { status: 400 });
  }
  const photo_url = await findPhotoOnWeb(query.trim());
  return NextResponse.json({ photo_url });
}
