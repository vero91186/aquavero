import type { Livestock, MaintenanceTaskType } from '@/types/database';

// Planning d'entretien daté, compté depuis le « jour 0 » : l'introduction des
// premiers animaux. Il reprend les calendriers de lib/introduction.ts (mousses,
// siphonnage) et y ajoute le rythme courant (changement d'eau, tests, vitres…).
export type PlanType = MaintenanceTaskType | 'test';

export interface PlanItem {
  date: Date;
  type: PlanType;
  title: string;
  // Une ligne : l'essentiel à faire, lisible d'un coup d'œil.
  summary: string;
  // Explications complètes, affichées à la demande.
  detail: string;
  // Écart toléré (en jours) entre la date prévue et une intervention notée
  // dans le journal pour la considérer comme faite.
  tolerance: number;
  // Mot à écrire dans la description du journal pour cocher cette tâche quand elle
  // partage son type avec d'autres (feuilles de catappa et engrais liquide, tous deux « dosage »).
  keyword?: string;
}

// Tous les mots-clés de tâches : un journal qui en contient un ne coche que la tâche correspondante.
export const PLAN_KEYWORDS = ['catappa', 'pastille'];

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

// Jour 0 = première introduction d'un animal (poisson ou invertébré) déjà faite :
// une date dans le futur est une introduction prévue, pas un jour 0.
export function firstIntroduction(livestock: Livestock[], today: Date = new Date()): Date | null {
  const limit = startOfDay(today).getTime();
  const dates = livestock
    .filter((l) => l.category !== 'plant' && l.added_at)
    .map((l) => new Date(`${l.added_at}T12:00:00`).getTime())
    .filter((t) => t <= limit);
  return dates.length > 0 ? new Date(Math.min(...dates)) : null;
}

export function dayNumber(day0: Date, d: Date): number {
  return Math.round((startOfDay(d).getTime() - startOfDay(day0).getTime()) / 86400000);
}

// Les mousses du filtre ne se touchent jamais le jour du changement d'eau et du
// siphonnage (jours 0 modulo 7) : on décale de 3 jours si besoin.
function offWaterChangeDay(n: number): number {
  return n % 7 === 0 ? n + 3 : n;
}

// Feuilles de catappa : environ 1 feuille moyenne (15 à 20 cm) pour 40 à 50 L d'eau,
// soit un minimum d'une feuille. Les tanins n'abaissent pas le pH d'une eau dure.
export function catappaLeaves(volumeLiters: number): number {
  return Math.max(1, Math.round(volumeLiters / 50));
}

// Ce que contient le bac : le planning ne propose que les tâches qui le concernent.
export interface PlanContext {
  hasAnimals: boolean;
  hasShrimp: boolean;
  hasInvertebrates: boolean;
  hasPlants: boolean;
  // Noms des plantes qui se nourrissent par les racines (Cryptocoryne, Echinodorus, Vallisneria…).
  rootFeeders: string[];
}

const SHRIMP = /crevette|caridina|neocaridina|atyopsis|macrobrachium|shrimp/i;
const ROOT_FEEDER = /crypto|echinodorus|sagittaria|vallisneria|aponogeton|barclaya|amazone/i;

export function contextFromLivestock(livestock: Livestock[]): PlanContext {
  const animals = livestock.filter((l) => l.category === 'fish' || l.category === 'invertebrate');
  const inverts = animals.filter((l) => l.category === 'invertebrate');
  const plants = livestock.filter((l) => l.category === 'plant');
  return {
    hasAnimals: animals.length > 0,
    hasShrimp: inverts.some((l) => SHRIMP.test(`${l.species_common_name} ${l.species_scientific_name ?? ''}`)),
    hasInvertebrates: inverts.length > 0,
    hasPlants: plants.length > 0,
    rootFeeders: [...new Set(plants.filter((l) => ROOT_FEEDER.test(`${l.species_common_name} ${l.species_scientific_name ?? ''}`)).map((l) => l.species_common_name))],
  };
}

export function buildPlan(day0: Date, from: Date, to: Date, volumeLiters: number, ctx: PlanContext): PlanItem[] {
  const items: PlanItem[] = [];
  const push = (n: number, it: Omit<PlanItem, 'date'>) => {
    const date = addDays(startOfDay(day0), n);
    if (date >= startOfDay(from) && date <= startOfDay(to)) items.push({ date, ...it });
  };
  const maxDay = dayNumber(day0, to);

  // Contrôle des premiers jours : le bac vient de recevoir de la charge.
  push(3, {
    type: 'test',
    title: 'Test NH4 / NO2',
    summary: 'NH4 et NO2 doivent rester à 0.',
    detail: "Trois jours après l'arrivée des premiers animaux : les deux doivent rester à 0. Sinon, change 30 % d'eau et ne rajoute rien.",
    tolerance: 0,
  });

  for (let k = 1; 7 * k <= maxDay; k++) {
    const n = 7 * k;
    // Test la veille du changement d'eau : chaque semaine 8 semaines, puis tous les 15 jours.
    if (k <= 8 || k % 2 === 0) {
      push(n - 1, {
        type: 'test',
        title: 'Test de l’eau',
        summary: 'NO2 à 0, NO3 sous 25. À noter dans l’onglet Tests.',
        detail: 'NH4, NO2, NO3, pH, KH, avant le changement d’eau. Note-les dans l’onglet Tests : NO2 à 0, NO3 sous 25.',
        tolerance: 0,
      });
    }
    const siphon = k >= 4;
    const zone = ((k - 4) % 3) + 1;
    push(n, {
      type: 'water_change',
      title: 'Changement d’eau',
      summary: siphon ? `Change 25 à 30 % de l’eau et siphonne le tiers n° ${zone} du sable.` : 'Change 20 à 25 % de l’eau, sans siphonner le sable.',
      detail: siphon
        ? `25 à 30 % d’eau, avec conditionneur sur l’eau neuve, à la même température. Siphonne le tiers n° ${zone} du sable en surface (pas autour des racines ni sous les pierres et le décor)${ctx.hasShrimp ? ', bas fin sur l’embout à cause des crevettes' : ''}.`
        : "20 à 25 % d’eau, avec conditionneur sur l’eau neuve, à la même température. Pas de siphonnage du sol avant la semaine 4 : enlève seulement les débris visibles.",
      tolerance: 3,
    });
    if (ctx.hasPlants) push(n, {
      type: 'dosing',
      title: 'Engrais liquide',
      summary: 'À verser après le changement d’eau, selon l’étiquette.',
      detail: 'Après le changement d’eau, dose selon l’étiquette (le calculateur plus bas donne les mL pour ton volume).',
      tolerance: 3,
    });
  }

  for (let n = 14; n <= maxDay; n += 14) {
    push(n + 2, {
      type: 'glass_clean',
      title: 'Nettoyage des vitres',
      summary: 'Racloir ou aimant sur les algues.',
      detail: 'Racloir ou aimant sur les algues, avant le changement d’eau suivant.' + (ctx.hasShrimp ? ' Évite les angles où se cachent les crevettes.' : ''),
      tolerance: 4,
    });
    if (ctx.hasPlants) push(n + 4, {
      type: 'other',
      title: 'Taille des plantes',
      summary: 'Retire les feuilles abîmées, éclaircis les flottantes.',
      detail: 'Coupe les feuilles abîmées, éclaircis les flottantes (couvre au plus la moitié de la surface) et rince-les avant de les jeter' + (ctx.hasInvertebrates ? ', pour les petits passagers.' : '.'),
      tolerance: 5,
    });
  }

  for (let n = 30; n <= maxDay; n += 30) {
    push(n + 5, {
      type: 'equipment_check',
      title: 'Vérification du matériel',
      summary: 'Chauffage, pompe, éclairage et tuyaux.',
      detail: 'Chauffage et thermomètre (température adaptée à tes espèces), débit de la pompe, rampe LED et programmateur, tuyaux du filtre.',
      tolerance: 7,
    });
  }

  // Feuilles de catappa : dosées selon le volume, renouvelées toutes les 4 semaines.
  const leaves = catappaLeaves(volumeLiters);
  const leafWord = `feuille${leaves > 1 ? 's' : ''}`;
  for (let n = 0; ctx.hasAnimals && n <= maxDay; n += 28) {
    push(n, {
      type: 'dosing',
      title: 'Feuilles de catappa',
      summary: n === 0
        ? `Mets ${leaves} ${leafWord} dans le bac.`
        : `Remplace les feuilles : ${leaves} ${leafWord} neuve${leaves > 1 ? 's' : ''}.`,
      detail: `Environ 1 feuille moyenne (15 à 20 cm) pour 40 à 50 L, soit ${leaves} ${leafWord} pour ${volumeLiters} L. Retire les restes des anciennes quand elles se désagrègent. L’effet sur le pH est négligeable dans une eau dure : elles servent surtout de cachette et de biofilm à brouter pour ${ctx.hasShrimp ? 'les crevettes et les poissons' : 'les poissons'}.`,
      tolerance: 5,
      keyword: 'catappa',
    });
  }

  // Autres tâches courantes, pour que rien ne soit oublié.
  for (let k = 1; ctx.hasAnimals && 7 * k <= maxDay; k++) {
    const n = 7 * k;
    push(n + 3, {
      type: 'observation',
      title: 'Observation des animaux',
      summary: ctx.hasShrimp ? 'Compte les poissons et les crevettes, regarde leur comportement.' : 'Compte les poissons, regarde leur comportement.',
      detail: 'Cherche les poissons isolés, nageoires collées, points blancs, respiration rapide, et les animaux inactifs. ' + (ctx.hasShrimp ? 'Les mues blanchâtres de crevettes au fond sont normales : laisse-les, elles sont mangées. ' : '') + 'Note ce que tu vois dans le journal.',
      tolerance: 3,
    });
    // Un jour sans nourriture par semaine, après le premier mois, laisse souffler le filtre et les animaux.
    if (k >= 4) {
      push(n + 5, {
        type: 'feeding',
        title: 'Jour sans nourriture',
        summary: 'Pas de repas aujourd’hui : les animaux grignotent les algues et le biofilm.',
        detail: 'Un jour de jeûne par semaine est sans risque pour des animaux adultes en bonne santé. Il limite les déchets et les algues. Ne le fais pas dans le premier mois ni si un animal semble affaibli.',
        tolerance: 2,
      });
    }
  }

  for (let n = 28; n <= maxDay; n += 28) {
    push(n + 10, {
      type: 'filter_clean',
      title: 'Grille d’aspiration et pré-filtre',
      summary: 'Rince la grille d’entrée du filtre dans l’eau du bac.',
      detail: 'Retire les débris collés sur la grille ou l’éponge de protection.' + (ctx.hasShrimp ? ' Indispensable avec des crevettes, qui se coincent dans une grille ouverte.' : '') + ' Rince-la dans un seau d’eau prélevée au changement d’eau, jamais au robinet, et remets-la en place.',
      tolerance: 5,
    });
    push(n + 17, {
      type: 'equipment_check',
      title: 'Couvercle et rampe LED',
      summary: 'Essuie la rampe LED et le couvercle : calcaire et poussière.',
      detail: 'Débranche, puis essuie avec un chiffon humide sans produit. Un éclairage voilé réduit la lumière reçue par les plantes et favorise les algues. Vérifie aussi que le programmateur est à la bonne heure.',
      tolerance: 5,
    });
  }

  for (let n = 45; n <= maxDay; n += 90) {
    push(offWaterChangeDay(n), {
      type: 'filter_clean',
      title: 'Hélice de la pompe et tuyaux',
      summary: 'Démonte la pompe, nettoie l’hélice et frotte les tuyaux.',
      detail: 'Coupe l’alimentation, sors la pompe, nettoie l’hélice et son logement avec une brosse à dents dans l’eau du bac. Rince les tuyaux de la même façon. Jamais le même jour que le changement de mousse du filtre.',
      tolerance: 10,
    });
  }

  for (let n = 30; ctx.rootFeeders.length > 0 && n <= maxDay; n += 90) {
    push(n, {
      type: 'dosing',
      title: 'Pastilles d’engrais racinaire',
      summary: `Enfonce une pastille près de chaque plante à racines (${ctx.rootFeeders.join(', ')}).`,
      detail: 'Ces plantes se nourrissent par les racines : une pastille par plante dans le sable, à 3 à 4 cm de profondeur, à renouveler tous les trois mois. Pas besoin si le sol est nutritif.',
      tolerance: 10,
      keyword: 'pastille',
    });
  }

  // Mousses du filtre (calendrier de lib/introduction.ts) : grossière à 3 mois puis tous les
  // 3 mois, fines à 6 puis 9 mois, jamais le même jour que le changement d’eau.
  const foamJobs: { n: number; title: string; summary: string; detail: string }[] = [];
  for (let n = 90; n <= maxDay + 14; n += 90) {
    foamJobs.push({
      n,
      title: 'Mousse grossière du filtre',
      summary: 'Remplace-la, en gardant l’ancienne 2 à 3 semaines à côté.',
      detail: 'Remplace-la : pose la neuve à côté de l’ancienne 2 à 3 semaines pour qu’elle se colonise, puis retire l’ancienne. Rinçage de l’ancienne dans l’eau du bac, jamais au robinet.',
    });
  }
  foamJobs.push(
    { n: 190, title: 'Première mousse fine du filtre', summary: 'Remplace une seule mousse fine.', detail: 'Remplace une seule mousse fine, jamais le même jour que la grossière. Rinçage dans l’eau du bac prélevée au changement d’eau.' },
    { n: 280, title: 'Seconde mousse fine du filtre', summary: 'Remplace l’autre mousse fine.', detail: 'Remplace l’autre mousse fine, en décalé de la première.' }
  );
  for (const j of foamJobs) {
    push(offWaterChangeDay(j.n), { type: 'filter_clean', title: j.title, summary: j.summary, detail: j.detail, tolerance: 10 });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
