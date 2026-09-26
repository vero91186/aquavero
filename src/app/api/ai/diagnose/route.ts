import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { diagnoseFromInput } from '@/lib/ai/gemini';
import { computeHealthScore } from '@/lib/health-score';
import { daysSince } from '@/lib/cycling';

const CYCLING_LABELS: Record<string, string> = {
  not_started: 'pas encore démarré',
  cycling: 'en cours',
  cycled: 'terminé',
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { tankId, description, imageBase64, imageMimeType } = await req.json();
  if (!tankId || (!description && !imageBase64)) {
    return NextResponse.json(
      { error: 'tankId requis, avec une description ou une photo' },
      { status: 400 }
    );
  }

  const { data: tank } = await supabase.from('tanks').select('*').eq('id', tankId).single();
  if (!tank) return NextResponse.json({ error: 'Bac introuvable' }, { status: 404 });

  const { data: livestock } = await supabase.from('livestock').select('*').eq('tank_id', tankId);
  const { data: latestTest } = await supabase
    .from('water_tests')
    .select('*')
    .eq('tank_id', tankId)
    .order('tested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const health = computeHealthScore(tank, livestock ?? [], latestTest ?? null);

  const setupDays = daysSince(tank.setup_date);

  const tankContext = [
    `Bac ${tank.name}, ${tank.volume_liters} L, ${tank.water_type}`,
    `Mise en eau : ${tank.setup_date ? `${setupDays} jour${(setupDays ?? 0) > 1 ? 's' : ''}` : 'non renseignée'}`,
    `Statut du cyclage : ${CYCLING_LABELS[tank.cycling_status] ?? tank.cycling_status}`,
    `Score de santé actuel : ${health.score}/100`,
    `Peuplement : ${(livestock ?? []).map((l) => `${l.quantity} ${l.species_common_name}`).join(', ') || 'non renseigné'}`,
    latestTest
      ? `Derniers paramètres : pH ${latestTest.ph ?? '?'}, NH3 ${latestTest.ammonia_ppm ?? '?'}, NO2 ${latestTest.nitrite_ppm ?? '?'}, NO3 ${latestTest.nitrate_ppm ?? '?'}, T° ${latestTest.temperature_c ?? '?'}`
      : 'Aucun test récent',
  ].join('\n');

  try {
    const result = await diagnoseFromInput({
      tankContext,
      description,
      imageBase64,
      imageMimeType,
    });

    let photoUrl: string | null = null;
    if (imageBase64 && imageMimeType) {
      const buffer = Buffer.from(imageBase64, 'base64');
      const ext = imageMimeType.split('/')[1] ?? 'jpg';
      const path = `${user.id}/diagnostics/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('aquarium-photos')
        .upload(path, buffer, { contentType: imageMimeType });
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage.from('aquarium-photos').getPublicUrl(path);
        photoUrl = publicUrl.publicUrl;
      }
    }

    const { data: saved, error: insertError } = await supabase
      .from('ai_diagnostics')
      .insert({
        tank_id: tankId,
        user_id: user.id,
        input_type: imageBase64 && description ? 'both' : imageBase64 ? 'photo' : 'text',
        input_description: description ?? null,
        photo_url: photoUrl,
        likely_condition: result.likely_condition,
        confidence: result.confidence,
        severity: result.severity,
        recommended_actions: result.recommended_actions,
        vet_referral: result.vet_referral,
        raw_ai_response: result,
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ diagnostic: saved, explanation: result.explanation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
