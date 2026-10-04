import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSpeciesTraits } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { name, scientificName, kind } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Nom manquant' }, { status: 400 });
  }
  try {
    const traits = await analyzeSpeciesTraits({
      name: name.slice(0, 120),
      scientificName: typeof scientificName === 'string' ? scientificName.slice(0, 120) : null,
      kind: typeof kind === 'string' ? kind : undefined,
    });
    return NextResponse.json({ traits });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur inconnue' }, { status: 500 });
  }
}
