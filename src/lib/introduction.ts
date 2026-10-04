import type { DensityLine } from '@/lib/density';

// Ordre d'introduction conseillé, par étapes espacées. Règle générale
// d'aquariophilie : on commence par les espèces robustes, on laisse la
// filtration monter en charge, puis on ajoute les espèces plus exigeantes.
export interface IntroStep {
  step: number;
  title: string;
  timing: string;
  why: string;
  lines: DensityLine[];
}

const SENSITIVE =
  /otocinclus|rummy|brillant|apistogramma|ram\b|ram |papillon|discus|cristal|crystal|taiwan|blue bolt|boraras|dario|badis|axelrodia|ruby|paillete|celestial|ember|scalaire|cuivr[ée]|red nose|bee\b/i;
const TERRITORIAL =
  /ancistrus|pl[ée]co|cichlid|krib|pelvicachromis|nannacara|laetacara|gourami|betta|combattant|loche|botia|pangio|poisson-chat|synodontis|killi|paradis/i;

function stepOf(l: DensityLine): 1 | 2 | 3 | 4 {
  const name = `${l.name} ${l.scientificName ?? ''}`;
  if (SENSITIVE.test(name)) return 4;
  // Escargots et crevettes robustes d'abord : très peu de déchets, et la colonie
  // s'installe avant l'arrivée des poissons.
  if (l.kind === 'invertebrate') return 1;
  if (/corydoras|brochis|dianema/i.test(name)) return 2;
  if (TERRITORIAL.test(name)) return 3;
  return 2;
}

const STEPS: Omit<IntroStep, 'lines'>[] = [
  {
    step: 1,
    title: 'Escargots et crevettes robustes',
    timing: 'Après le rodage (nitrites à 0), jour 0',
    why: 'Ils produisent très peu de déchets et installent leur colonie avant les poissons, qui pourraient manger les bébés crevettes.',
  },
  {
    step: 2,
    title: 'Poissons robustes et corydoras',
    timing: '2 à 3 semaines plus tard',
    why: 'Petits poissons de banc résistants et corydoras, par lots de 6 à 8 maximum, pour lancer la charge en douceur.',
  },
  {
    step: 3,
    title: 'Territoriaux',
    timing: '4 à 6 semaines après l\'étape 1',
    why: 'Ancistrus, loches, gouramis, cichlidés nains : la filtration est stable et les algues et le biofilm sont présents.',
  },
  {
    step: 4,
    title: 'Espèces sensibles',
    timing: '8 à 12 semaines après l\'étape 1',
    why: 'Otocinclus, apistogrammas, rasboras brillant, crevettes Caridina : ils exigent une eau mature et stable.',
  },
];

export function introductionPlan(lines: DensityLine[]): IntroStep[] {
  const active = lines.filter((l) => l.quantity > 0);
  return STEPS.map((s) => ({ ...s, lines: active.filter((l) => stepOf(l) === s.step) })).filter((s) => s.lines.length > 0);
}
