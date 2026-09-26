import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { identifySpeciesFromPhoto } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { imageBase64, imageMimeType } = await req.json();
  if (!imageBase64 || !imageMimeType) {
    return NextResponse.json({ error: 'Photo requise' }, { status: 400 });
  }

  try {
    const result = await identifySpeciesFromPhoto(imageBase64, imageMimeType);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
