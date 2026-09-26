import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatWithAssistant } from '@/lib/ai/gemini';
import { computeBioload, computeHealthScore } from '@/lib/health-score';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { tankId, message, conversationId } = await req.json();
  if (!tankId || !message) {
    return NextResponse.json({ error: 'tankId et message requis' }, { status: 400 });
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

  const bioload = computeBioload(tank, livestock ?? []);
  const health = computeHealthScore(tank, livestock ?? [], latestTest ?? null);

  const tankContext = [
    `Nom : ${tank.name}`,
    `Type d'eau : ${tank.water_type}, volume : ${tank.volume_liters} L, planté : ${tank.is_planted ? 'oui' : 'non'}`,
    `Score de santé actuel : ${health.score}/100 (${health.label})`,
    `Charge biologique : ${bioload.loadLevel}`,
    `Peuplement : ${(livestock ?? [])
      .map((l) => `${l.quantity} ${l.species_common_name}`)
      .join(', ') || 'aucun renseigné'}`,
    latestTest
      ? `Dernier test (${latestTest.tested_at}) : pH ${latestTest.ph ?? '?'}, NH3 ${latestTest.ammonia_ppm ?? '?'}, NO2 ${latestTest.nitrite_ppm ?? '?'}, NO3 ${latestTest.nitrate_ppm ?? '?'}, GH ${latestTest.gh_dgh ?? '?'}, KH ${latestTest.kh_dkh ?? '?'}, T° ${latestTest.temperature_c ?? '?'}`
      : 'Aucun test enregistré',
  ].join('\n');

  let convoId = conversationId as string | undefined;
  if (!convoId) {
    const { data: convo, error } = await supabase
      .from('ai_conversations')
      .insert({ tank_id: tankId, user_id: user.id, title: message.slice(0, 60) })
      .select('id')
      .single();
    if (error || !convo) {
      return NextResponse.json({ error: 'Impossible de créer la conversation' }, { status: 500 });
    }
    convoId = convo.id;
  }

  const { data: history } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true })
    .limit(20);

  const historyText = (history ?? []).map((m) => `${m.role}: ${m.content}`).join('\n');

  await supabase.from('ai_messages').insert({
    conversation_id: convoId,
    user_id: user.id,
    role: 'user',
    content: message,
  });

  try {
    const reply = await chatWithAssistant(message, tankContext, historyText);

    await supabase.from('ai_messages').insert({
      conversation_id: convoId,
      user_id: user.id,
      role: 'assistant',
      content: reply,
    });

    return NextResponse.json({ reply, conversationId: convoId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
