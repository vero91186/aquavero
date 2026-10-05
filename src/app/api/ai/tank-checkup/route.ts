import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkupTank } from '@/lib/ai/gemini';
import { computeHealthScore, computeBioload } from '@/lib/health-score';
import { daysSince } from '@/lib/cycling';
import { computeReminders } from '@/lib/reminders';
import { computeShelfLife } from '@/lib/shelf-life';
import { TASK_LABELS } from '@/lib/maintenance';
import type { MaintenanceLog, MaintenanceTaskType } from '@/types/database';

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

  const { tankId, images } = (await req.json()) as {
    tankId?: string;
    // Photo(s) d'ensemble du bac, optionnelles — en plus des données déjà
    // enregistrées, pour repérer les problèmes visibles (algues, aspect des
    // plantes/poissons, propreté...).
    images?: { base64: string; mimeType: string }[];
  };
  if (!tankId) return NextResponse.json({ error: 'tankId requis' }, { status: 400 });

  const { data: tank } = await supabase.from('tanks').select('*').eq('id', tankId).single();
  if (!tank) return NextResponse.json({ error: 'Bac introuvable' }, { status: 404 });

  const [{ data: livestock }, { data: tests }, { data: logs }, { data: products }, { data: equipment }] = await Promise.all([
    supabase.from('livestock').select('*').eq('tank_id', tankId),
    supabase.from('water_tests').select('*').eq('tank_id', tankId).order('tested_at', { ascending: false }).limit(3),
    supabase.from('maintenance_logs').select('*').eq('tank_id', tankId).order('performed_at', { ascending: false }),
    supabase.from('products').select('*').eq('tank_id', tankId),
    supabase.from('tank_equipment').select('*').eq('tank_id', tankId),
  ]);

  const livestockList = livestock ?? [];
  const testsList = tests ?? [];
  const logsList: MaintenanceLog[] = logs ?? [];
  const productsList = products ?? [];
  const equipmentList = equipment ?? [];

  const latestTest = testsList[0] ?? null;
  const health = computeHealthScore(tank, livestockList, latestTest);
  const bioload = computeBioload(tank, livestockList);
  const setupDays = daysSince(tank.setup_date);
  const reminders = computeReminders(logsList);

  // Dernière intervention par type, pour repérer un entretien très en retard
  // même sans rappel programmé (ex. jamais de nettoyage de filtre noté).
  const lastByType = new Map<MaintenanceTaskType, MaintenanceLog>();
  for (const log of logsList) {
    if (!lastByType.has(log.task_type)) lastByType.set(log.task_type, log);
  }

  const maintenanceLines = (['water_change', 'filter_clean', 'glass_clean', 'dosing', 'feeding', 'equipment_check'] as MaintenanceTaskType[])
    .map((type) => {
      const last = lastByType.get(type);
      if (!last) return `${TASK_LABELS[type]} : jamais enregistré`;
      const days = daysSince(last.performed_at);
      return `${TASK_LABELS[type]} : il y a ${days} jour${(days ?? 0) > 1 ? 's' : ''}`;
    })
    .join(' — ');

  const remindersLine = reminders.length > 0
    ? reminders
        .map((r) => `${TASK_LABELS[r.taskType]} ${r.level === 'overdue' ? `en retard de ${Math.abs(r.daysLeft)} j` : `dans ${r.daysLeft} j`}`)
        .join(', ')
    : 'aucun rappel programmé en retard ou proche';

  const expiringProducts = productsList
    .map((p) => ({ p, status: computeShelfLife(p.opened_at, p.shelf_life_days_after_opening) }))
    .filter((x) => x.status && x.status.level !== 'ok');
  const productsLine = expiringProducts.length > 0
    ? expiringProducts
        .map((x) => `${x.p.name} (${x.status!.level === 'expired' ? 'probablement périmé' : `à utiliser sous ${x.status!.daysLeft} j`})`)
        .join(', ')
    : 'aucun produit signalé proche de la péremption';

  // Plantes : ancienneté dans le bac (période d'adaptation), fiche technique
  // si elle existe, et matériel/produits qui conditionnent leur croissance.
  const plants = livestockList.filter((l) => l.category === 'plant');
  const plantLines = plants.map((l) => {
    const age = daysSince(l.added_at);
    const info = l.plant_info;
    const needs = info
      ? [
          info.light && `lumière : ${info.light}`,
          info.co2 && `CO2 : ${info.co2}`,
          info.temperature && `température : ${info.temperature}`,
          info.water && `eau : ${info.water}`,
          info.difficulty && `difficulté : ${info.difficulty}`,
        ]
          .filter(Boolean)
          .join(', ')
      : '';
    return `- ${l.species_common_name}${l.species_scientific_name ? ` (${l.species_scientific_name})` : ''} ×${l.quantity} — ${
      age === null ? "date d'ajout inconnue" : `dans le bac depuis ${age} j`
    }${l.adult_size_cm ? `, taille adulte ${l.adult_size_cm} cm` : ''}${needs ? ` — besoins connus : ${needs}` : ''}`;
  });
  const lightEquipment = equipmentList.filter((e) => e.kind === 'light');
  const co2Equipment = equipmentList.filter((e) => e.kind === 'co2');
  const fertilizers = productsList.filter((p) => p.category === 'fertilizer');
  const plantContext = plants.length
    ? [
        `Plantes (${plants.length} espèce${plants.length > 1 ? 's' : ''}) :`,
        ...plantLines,
        `Conditions de culture : éclairage ${
          lightEquipment.length ? lightEquipment.map((e) => `${e.name}${e.power_w ? ` ${e.power_w} W` : ''}`).join(', ') : 'matériel non renseigné'
        }, ${tank.lighting_hours_per_day ?? '?'} h/jour ; CO2 : ${
          co2Equipment.length ? co2Equipment.map((e) => e.name).join(', ') : 'aucun matériel de CO2 renseigné'
        } ; sol : ${tank.substrate ?? 'non renseigné'}${tank.fertile_soil ? ' (nutritif)' : ''} ; engrais : ${
          fertilizers.length ? fertilizers.map((f) => f.name).join(', ') : 'aucun produit renseigné'
        }`,
      ].join('\n')
    : 'Plantes : aucune plante enregistrée';

  const tankContext = [
    `Bac "${tank.name}", ${tank.volume_liters} L, ${tank.water_type}, ${tank.is_planted ? 'planté' : 'non planté'}`,
    `Mise en eau : ${tank.setup_date ? `il y a ${setupDays} jour${(setupDays ?? 0) > 1 ? 's' : ''}` : 'date non renseignée'}`,
    `Statut du cyclage déclaré : ${CYCLING_LABELS[tank.cycling_status] ?? tank.cycling_status}`,
    `Score de santé calculé (règles fixes, indicatif) : ${health.score}/100 (${health.label})`,
    `Charge biologique : ${bioload.loadLevel} (${bioload.bioloadPerLiter.toFixed(3)} unité/L)`,
    `Peuplement : ${
      livestockList.length > 0
        ? livestockList.map((l) => `${l.quantity} ${l.species_common_name} (${l.category})`).join(', ')
        : 'aucun animal ni plante enregistré'
    }`,
    latestTest
      ? `Dernier test d'eau (il y a ${daysSince(latestTest.tested_at)} jour${(daysSince(latestTest.tested_at) ?? 0) > 1 ? 's' : ''}) : pH ${latestTest.ph ?? '?'}, NH3 ${latestTest.ammonia_ppm ?? '?'} ppm, NO2 ${latestTest.nitrite_ppm ?? '?'} ppm, NO3 ${latestTest.nitrate_ppm ?? '?'} ppm, GH ${latestTest.gh_dgh ?? '?'}, KH ${latestTest.kh_dkh ?? '?'}, T° ${latestTest.temperature_c ?? '?'}`
      : "Aucun test d'eau enregistré",
    `Historique d'entretien (dernière fois par type) : ${maintenanceLines}`,
    `Rappels programmés : ${remindersLine}`,
    `Produits : ${productsLine}`,
    plantContext,
  ].join('\n');

  try {
    const result = await checkupTank({ tankContext, images });

    // Sauvegarde la ou les photos fournies dans le bucket, pour les
    // rattacher à l'entrée du journal ci-dessous.
    let firstPhotoUrl: string | null = null;
    for (const img of images ?? []) {
      const ext = img.mimeType.split('/')[1] ?? 'jpg';
      const path = `${user.id}/checkup/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const buffer = Buffer.from(img.base64, 'base64');
      const { error: uploadError } = await supabase.storage
        .from('aquarium-photos')
        .upload(path, buffer, { contentType: img.mimeType });
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage.from('aquarium-photos').getPublicUrl(path);
        if (!firstPhotoUrl) firstPhotoUrl = publicUrl.publicUrl;
      }
    }

    // Trace le scan dans le journal du bac (entrée "Observation"), pour
    // garder une note de ce qui a été relevé sans que ça bloque la réponse
    // si l'insertion échoue pour une raison ou une autre.
    const issuesSummary = result.issues?.length
      ? result.issues.map((i) => `[${i.severity}] ${i.label}`).join(' · ')
      : 'aucun problème détecté';
    const todosSummary = result.todos?.length ? ` — À faire : ${result.todos.join(' ; ')}` : '';
    const plantsSummary = result.plants?.length
      ? ` Plantes : ${result.plants.map((p) => `${p.name} (${p.status})`).join(' ; ')}${result.plant_summary ? ` — ${result.plant_summary}` : ''}.`
      : '';
    const description = `Scan complet IA — ${result.overall_assessment} Problèmes relevés : ${issuesSummary}.${todosSummary}${plantsSummary}`;

    await supabase.from('maintenance_logs').insert({
      tank_id: tankId,
      user_id: user.id,
      task_type: 'observation',
      description,
      performed_at: new Date().toISOString(),
      photo_url: firstPhotoUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
