import type { Livestock, MaintenanceTaskType } from '@/types/database';

// Planning d'entretien daté, compté depuis le « jour 0 » : l'introduction des
// premiers animaux. Il reprend les calendriers de lib/introduction.ts (mousses,
// siphonnage) et y ajoute le rythme courant (changement d'eau, tests, vitres…).
export type PlanType = MaintenanceTaskType | 'test';

export interface PlanItem {
  date: Date;
  type: PlanType;
  title: string;
  detail: string;
  // Écart toléré (en jours) entre la date prévue et une intervention notée
  // dans le journal pour la considérer comme faite.
  tolerance: number;
}

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

export function buildPlan(day0: Date, from: Date, to: Date): PlanItem[] {
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
        detail: 'NH4, NO2, NO3, pH, KH, avant le changement d’eau. Note-les dans l’onglet Tests : NO2 à 0, NO3 sous 25.',
        tolerance: 0,
      });
    }
    const siphon = k >= 4;
    const zone = ((k - 4) % 3) + 1;
    push(n, {
      type: 'water_change',
      title: 'Changement d’eau',
      detail: siphon
        ? `25 à 30 % d’eau, avec conditionneur sur l’eau neuve, à la même température. Siphonne le tiers n° ${zone} du sable en surface (pas autour des racines ni sous les ardoises), bas fin sur l’embout à cause des crevettes.`
        : "20 à 25 % d’eau, avec conditionneur sur l’eau neuve, à la même température. Pas de siphonnage du sol avant la semaine 4 : enlève seulement les débris visibles.",
      tolerance: 3,
    });
    push(n, {
      type: 'dosing',
      title: 'Engrais liquide',
      detail: 'Après le changement d’eau, dose selon l’étiquette (le calculateur plus bas donne les mL pour ton volume).',
      tolerance: 3,
    });
  }

  for (let n = 14; n <= maxDay; n += 14) {
    push(n + 2, {
      type: 'glass_clean',
      title: 'Nettoyage des vitres',
      detail: 'Racloir ou aimant sur les algues, avant le changement d’eau suivant. Évite les angles où se cachent les crevettes.',
      tolerance: 4,
    });
    push(n + 4, {
      type: 'other',
      title: 'Taille des plantes',
      detail: 'Coupe les feuilles abîmées, éclaircis les flottantes (couvre au plus la moitié de la surface) et rince-les avant de les jeter, pour les petits passagers.',
      tolerance: 5,
    });
  }

  for (let n = 30; n <= maxDay; n += 30) {
    push(n + 5, {
      type: 'equipment_check',
      title: 'Vérification du matériel',
      detail: 'Chauffage et thermomètre (24 à 26 °C), débit de la pompe, rampe LED et programmateur, tuyaux du filtre.',
      tolerance: 7,
    });
  }

  // Mousses du filtre (calendrier de lib/introduction.ts) : grossière à 3 mois puis tous les
  // 3 mois, fines à 6 puis 9 mois, jamais le même jour que le changement d’eau.
  const foamJobs: { n: number; title: string; detail: string }[] = [];
  for (let n = 90; n <= maxDay + 14; n += 90) {
    foamJobs.push({
      n,
      title: 'Mousse grossière du filtre',
      detail: 'Remplace-la : pose la neuve à côté de l’ancienne 2 à 3 semaines pour qu’elle se colonise, puis retire l’ancienne. Rinçage de l’ancienne dans l’eau du bac, jamais au robinet.',
    });
  }
  foamJobs.push(
    { n: 190, title: 'Première mousse fine du filtre', detail: 'Remplace une seule mousse fine, jamais le même jour que la grossière. Rinçage dans l’eau du bac prélevée au changement d’eau.' },
    { n: 280, title: 'Seconde mousse fine du filtre', detail: 'Remplace l’autre mousse fine, en décalé de la première.' }
  );
  for (const j of foamJobs) {
    push(offWaterChangeDay(j.n), { type: 'filter_clean', title: j.title, detail: j.detail, tolerance: 10 });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
