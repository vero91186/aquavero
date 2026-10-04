import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { identifyObservation } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { description, hint, imageBase64, imageMimeType } = await req.json();
  if (!description && !imageBase64) {
    return NextResponse.json({ error: 'Une description ou une photo est requise' }, { status: 400 });
  }

  try {
    const result = await identifyObservation({
      description: typeof description === 'string' ? description : undefined,
      hint: typeof hint === 'string' ? hint : undefined,
      imageBase64,
      imageMimeType,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
