import type { Tank, WaterTest } from '@/types/database';

export type Zone = 'good' | 'warn' | 'bad';

export interface ParamSpec {
  key: keyof WaterTest;
  label: string;
  unit: string;
  // Échelle affichée sur la jauge.
  min: number;
  max: number;
  // Plage verte (idéale) ; orange = tolérable, juste en dehors du vert ;
  // rouge = au-delà de la plage orange.
  good: [number, number];
  warn: [number, number];
  lowAdvice?: string;
  highAdvice?: string;
}

const FRESH: ParamSpec[] = [
  { key: 'ph', label: 'pH', unit: '', min: 5.5, max: 9, good: [6.5, 7.8], warn: [6, 8.4],
    lowAdvice: 'pH bas : vérifie le KH (tampon) et fais des changements d’eau progressifs.',
    highAdvice: 'pH élevé : change l’eau par petites quantités et évite tout produit qui fait monter le pH.' },
  { key: 'ammonia_ppm', label: 'Ammoniac (NH3/NH4)', unit: 'ppm', min: 0, max: 1, good: [0, 0.1], warn: [0, 0.5],
    highAdvice: 'Toxique : change 30 à 50 % de l’eau, ajoute un conditionneur, réduis la nourriture.' },
  { key: 'nitrite_ppm', label: 'Nitrites (NO2)', unit: 'ppm', min: 0, max: 1, good: [0, 0.1], warn: [0, 0.5],
    highAdvice: 'Toxique : change 30 à 50 % de l’eau, réduis la nourriture, vérifie le filtre.' },
  { key: 'nitrate_ppm', label: 'Nitrates (NO3)', unit: 'ppm', min: 0, max: 100, good: [0, 30], warn: [0, 50],
    highAdvice: 'Nitrates élevés : change de l’eau, nettoie le sol, ne surnourris pas.' },
  { key: 'gh_dgh', label: 'GH', unit: '°dGH', min: 0, max: 25, good: [4, 12], warn: [2, 18],
    lowAdvice: 'Eau très douce : remonte avec un minéralisant GH.',
    highAdvice: 'Eau très dure : coupe avec de l’eau osmosée.' },
  { key: 'kh_dkh', label: 'KH', unit: '°dKH', min: 0, max: 15, good: [3, 8], warn: [1.5, 12],
    lowAdvice: 'KH bas : risque de chute du pH, remonte avec un minéralisant KH.',
    highAdvice: 'KH élevé : coupe avec de l’eau osmosée.' },
  { key: 'temperature_c', label: 'Température', unit: '°C', min: 15, max: 35, good: [22, 28], warn: [20, 30],
    lowAdvice: 'Eau trop froide : vérifie le chauffage.',
    highAdvice: 'Eau trop chaude : aère, ouvre le couvercle, vérifie le chauffage.' },
];

const SALT: ParamSpec[] = [
  { key: 'ph', label: 'pH', unit: '', min: 7.4, max: 8.8, good: [8, 8.4], warn: [7.8, 8.6] },
  { key: 'ammonia_ppm', label: 'Ammoniac (NH3/NH4)', unit: 'ppm', min: 0, max: 1, good: [0, 0.05], warn: [0, 0.25],
    highAdvice: 'Toxique : change de l’eau et cherche la cause (mortalité, surpopulation).' },
  { key: 'nitrite_ppm', label: 'Nitrites (NO2)', unit: 'ppm', min: 0, max: 1, good: [0, 0.05], warn: [0, 0.25],
    highAdvice: 'Toxique : change de l’eau, vérifie le filtre.' },
  { key: 'nitrate_ppm', label: 'Nitrates (NO3)', unit: 'ppm', min: 0, max: 50, good: [0, 10], warn: [0, 25],
    highAdvice: 'Nitrates élevés : change de l’eau, réduis la nourriture.' },
  { key: 'kh_dkh', label: 'KH', unit: '°dKH', min: 4, max: 16, good: [7, 12], warn: [6, 14] },
  { key: 'temperature_c', label: 'Température', unit: '°C', min: 20, max: 32, good: [24, 27], warn: [23, 28],
    lowAdvice: 'Eau trop froide : vérifie le chauffage.',
    highAdvice: 'Eau trop chaude : aère et refroidis.' },
];

export interface ParamAnalysis {
  spec: ParamSpec;
  value: number;
  zone: Zone;
  advice: string | null;
}

export interface WaterAnalysis {
  params: ParamAnalysis[];
  verdict: Zone;
  verdictLabel: string;
  cycling: boolean;
}

export function specsForTank(tank: Tank): ParamSpec[] {
  return tank.water_type === 'saltwater' ? SALT : FRESH;
}

export function zoneOf(spec: ParamSpec, v: number): Zone {
  if (v >= spec.good[0] && v <= spec.good[1]) return 'good';
  if (v >= spec.warn[0] && v <= spec.warn[1]) return 'warn';
  return 'bad';
}

export function analyzeWaterTest(test: WaterTest, tank: Tank): WaterAnalysis {
  const cycling = tank.cycling_status !== 'cycled';
  const params: ParamAnalysis[] = [];
  for (const spec of specsForTank(tank)) {
    const v = test[spec.key] as number | null;
    if (v === null || v === undefined) continue;
    const zone = zoneOf(spec, v);
    let advice: string | null = null;
    if (zone !== 'good') {
      const high = v > spec.good[1];
      advice = (high ? spec.highAdvice : spec.lowAdvice) ?? null;
      // Pendant le rodage, de l'ammoniac / des nitrites sont attendus.
      if (cycling && (spec.key === 'ammonia_ppm' || spec.key === 'nitrite_ppm')) {
        advice = 'Normal pendant le rodage (cycle de l’azote) : ne change l’eau que si c’est très élevé et surveille chaque jour.';
      }
    }
    params.push({ spec, value: v, zone, advice });
  }
  const bad = params.filter((p) => p.zone === 'bad').length;
  const warn = params.filter((p) => p.zone === 'warn').length;
  const verdict: Zone = bad > 0 ? 'bad' : warn > 0 ? 'warn' : 'good';
  const verdictLabel =
    verdict === 'good'
      ? 'Eau bonne : tous les paramètres sont dans la zone idéale.'
      : verdict === 'warn'
        ? `À surveiller : ${warn} paramètre${warn > 1 ? 's' : ''} hors de la zone idéale.`
        : `À corriger : ${bad} paramètre${bad > 1 ? 's' : ''} en zone rouge.`;
  return { params, verdict, verdictLabel, cycling };
}
