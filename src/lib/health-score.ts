import type { Livestock, Tank, WaterTest } from '@/types/database';
import { INVERTEBRATE_COEF, DENSITY_LIMIT, computeDensity, linesFromLivestock } from '@/lib/density';

// Calcul générique de charge biologique et de score de santé.
// Ne dépend d'aucune population figée : s'adapte à n'importe quel bac,
// à partir de son volume et de son peuplement déclaré.

export interface BioloadResult {
  totalBioloadUnits: number;
  bioloadPerLiter: number;
  // Densité en cm équivalent poisson par litre d'eau réelle : la mesure qui
  // fixe le niveau de charge (limite conseillée : DENSITY_LIMIT).
  densityCmPerLiter: number;
  loadLevel: 'faible' | 'modérée' | 'élevée' | 'critique';
}

export function computeBioload(tank: Tank, livestock: Livestock[]): BioloadResult {
  // Crevettes et escargots pèsent moins sur le bac que des poissons : même
  // coefficient (30 %) que dans le calcul de densité, pour que le score de santé
  // et les repères de peuplement racontent la même chose.
  const totalBioloadUnits = livestock.reduce(
    (sum, item) =>
      sum + item.bioload_factor * item.quantity * (item.category === 'invertebrate' ? INVERTEBRATE_COEF : 1),
    0
  );
  const bioloadPerLiter = tank.volume_liters > 0 ? totalBioloadUnits / tank.volume_liters : 0;

  // Le niveau de charge vient du même calcul que l'onglet Peuplement et l'aperçu
  // (cm équivalent poisson par litre d'eau réelle, limite conseillée 1,5), pour
  // que le score de santé ne contredise jamais « Aéré / Raisonnable / Chargé ».
  const ratio = computeDensity(
    linesFromLivestock(livestock),
    tank.volume_liters,
    tank.gross_volume_liters ?? null,
    null,
  ).ratioNet;
  let loadLevel: BioloadResult['loadLevel'] = 'faible';
  if (ratio >= 2) loadLevel = 'critique';
  else if (ratio >= DENSITY_LIMIT) loadLevel = 'élevée';
  else if (ratio >= 1) loadLevel = 'modérée';

  return { totalBioloadUnits, bioloadPerLiter, densityCmPerLiter: ratio, loadLevel };
}

export interface HealthScoreResult {
  score: number; // 0-100
  label: 'excellent' | 'bon' | 'à surveiller' | 'préoccupant';
  factors: { label: string; impact: number; detail: string }[];
}

const SAFE_RANGES: Record<string, [number, number]> = {
  ph: [6.5, 7.8],
  ammonia_ppm: [0, 0.25],
  nitrite_ppm: [0, 0.25],
  nitrate_ppm: [0, 40],
  gh_dgh: [4, 12],
  kh_dkh: [3, 8],
  temperature_c: [22, 28],
};

export function computeHealthScore(
  tank: Tank,
  livestock: Livestock[],
  latestTest: WaterTest | null
): HealthScoreResult {
  const factors: HealthScoreResult['factors'] = [];
  let score = 100;

  const hasFish = livestock.some((l) => l.category === 'fish' && l.quantity > 0);
  if (tank.cycling_status !== 'cycled' && hasFish) {
    if (tank.cycling_status === 'not_started') {
      score -= 30;
      factors.push({
        label: 'Cyclage',
        impact: -30,
        detail: 'Poissons présents mais le cyclage du bac n\'a pas été démarré',
      });
    } else {
      score -= 18;
      factors.push({
        label: 'Cyclage',
        impact: -18,
        detail: 'Cyclage en cours : ammoniac et nitrites à surveiller de près tant que les poissons sont en place',
      });
    }
  }

  const { bioloadPerLiter, loadLevel } = computeBioload(tank, livestock);
  if (loadLevel === 'critique') {
    score -= 25;
    factors.push({ label: 'Charge biologique', impact: -25, detail: 'Population très dense pour ce volume' });
  } else if (loadLevel === 'élevée') {
    score -= 12;
    factors.push({ label: 'Charge biologique', impact: -12, detail: 'Population dense, surveiller les nitrates' });
  } else if (loadLevel === 'modérée') {
    factors.push({ label: 'Charge biologique', impact: 0, detail: 'Population raisonnable pour ce volume' });
  } else {
    factors.push({ label: 'Charge biologique', impact: 0, detail: 'Population légère' });
  }

  if (!latestTest) {
    score -= 15;
    factors.push({ label: 'Suivi des paramètres', impact: -15, detail: 'Aucun test récent enregistré' });
  } else {
    for (const [key, [min, max]] of Object.entries(SAFE_RANGES)) {
      const value = latestTest[key as keyof WaterTest] as number | null;
      if (value === null || value === undefined) continue;
      if (value < min || value > max) {
        const isAmmoniaOrNitrite = key === 'ammonia_ppm' || key === 'nitrite_ppm';
        const impact = isAmmoniaOrNitrite ? -20 : -8;
        score += impact;
        factors.push({
          label: labelFor(key),
          impact,
          detail: `${value} hors plage recommandée (${min}-${max})`,
        });
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  let label: HealthScoreResult['label'] = 'excellent';
  if (score < 50) label = 'préoccupant';
  else if (score < 75) label = 'à surveiller';
  else if (score < 90) label = 'bon';

  return { score, label, factors, ...{ bioloadPerLiter } } as HealthScoreResult;
}

function labelFor(key: string): string {
  const labels: Record<string, string> = {
    ph: 'pH',
    ammonia_ppm: 'Ammoniac',
    nitrite_ppm: 'Nitrites',
    nitrate_ppm: 'Nitrates',
    gh_dgh: 'GH',
    kh_dkh: 'KH',
    temperature_c: 'Température',
  };
  return labels[key] ?? key;
}
