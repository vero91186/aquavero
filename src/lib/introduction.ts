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
  if (l.kind === 'invertebrate') return /escargot|neritina|planorb|physe|clea|helen|tylomelania|bellamya|trompette/i.test(name) ? 2 : 3;
  if (/corydoras|brochis|dianema/i.test(name)) return 2;
  if (TERRITORIAL.test(name)) return 3;
  return 1;
}

const STEPS: Omit<IntroStep, 'lines'>[] = [
  {
    step: 1,
    title: 'Premiers poissons, robustes',
    timing: 'Après le rodage (nitrites à 0), jour 0',
    why: 'Petits poissons de banc résistants : ils lancent la charge biologique en douceur. Par lots de 6 à 8 maximum.',
  },
  {
    step: 2,
    title: 'Poissons de fond et escargots',
    timing: '2 semaines plus tard',
    why: 'Le sol et le biofilm sont installés ; les corydoras et les escargots trouvent de quoi manger.',
  },
  {
    step: 3,
    title: 'Territoriaux et crevettes robustes',
    timing: '4 semaines plus tard',
    why: 'Ancistrus, loches, gouramis, cichlidés nains et crevettes Neocaridina : la filtration est stable et les algues/biofilm sont présents.',
  },
  {
    step: 4,
    title: 'Espèces sensibles',
    timing: '8 à 12 semaines plus tard',
    why: 'Otocinclus, apistogrammas, rasboras brillant, crevettes Caridina : ils exigent une eau mature et stable.',
  },
];

export function introductionPlan(lines: DensityLine[]): IntroStep[] {
  const active = lines.filter((l) => l.quantity > 0);
  return STEPS.map((s) => ({ ...s, lines: active.filter((l) => stepOf(l) === s.step) })).filter((s) => s.lines.length > 0);
}
