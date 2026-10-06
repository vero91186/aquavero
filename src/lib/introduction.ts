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

// Calendrier des mousses du filtre, à lire avec l'ordre d'ajout : les mousses
// biologiques portent les bactéries, donc on n'y touche pas pendant la montée
// en charge, puis on les renouvelle une à la fois et en décalé. Dates comptées
// depuis le jour 0 (nitrites à 0, arrivée des premiers animaux).
export interface FoamStep {
  when: string;
  action: string;
}

export const FOAM_PLAN: FoamStep[] = [
  {
    when: 'Jour 0 à semaine 12',
    action:
      "Ne remplace aucune mousse biologique. Si le débit baisse, rince seulement la mousse grossière dans l'eau du bac prélevée au changement d'eau, jamais au robinet (le chlore tue les bactéries).",
  },
  {
    when: 'À 3 mois',
    action:
      "Remplace la mousse grossière. Pose la neuve à côté de l'ancienne 2 à 3 semaines pour qu'elle se colonise, puis retire l'ancienne. Ensuite, tous les 3 mois environ.",
  },
  {
    when: 'À 6 mois, puis 9 mois',
    action:
      "Remplace une mousse fine à 6 mois, l'autre à 9 mois (entre 3 et 9 mois selon l'état : quand elle s'effrite ou se tasse). Jamais la grossière et la fine le même jour.",
  },
];

// Références pour un filtre Juwel Bioflow M (Rio 125/180/240, Lido, Vision 180…).
// Ce sont les codes-barres (EAN) des produits Juwel ; la cartouche complète
// Bioflow M porte la référence 85091 selon la notice du fabricant.
export const JUWEL_BIOFLOW_M_REFS: { name: string; ref: string; note: string }[] = [
  { name: 'bioPlus M, mousse grossière', ref: '4022573880502', note: 'tous les 3 mois' },
  { name: 'bioPlus M, mousse fine', ref: '4022573880519', note: 'entre 3 et 9 mois, en décalé' },
  { name: 'Nitrax M (anti-nitrates, facultatif)', ref: '4022573880557', note: 'toutes les 8 semaines' },
];

// Calendrier du siphonnage du sol, à lire avec l'ordre d'ajout. Il se fait
// pendant le changement d'eau, par zones. Sable fin planté : on aspire les
// déchets en surface, on ne creuse pas, pour ne pas abîmer les racines ni
// les bactéries du sol.
export const SIPHON_PLAN: FoamStep[] = [
  {
    when: 'Jour 0 à semaine 4',
    action:
      "Pas de siphonnage du sol : le bac est jeune et les bactéries s'installent. Au changement d'eau, enlève seulement les débris visibles en tenant le tuyau au-dessus du sable.",
  },
  {
    when: 'À partir de la semaine 4, chaque semaine',
    action:
      "Au changement d'eau, siphonne un tiers du sable en surface, en changeant de zone à chaque fois, pour que tout le sol soit fait en trois semaines. Tiens le tuyau à 1 cm au-dessus du sable et laisse les déchets légers monter, sans creuser.",
  },
  {
    when: 'Zones à éviter',
    action:
      "Pas autour des racines des Cryptocoryne et des Vallisneria, ni sous les ardoises et le bois : laisse le mulm s'y décomposer, les plantes s'en nourrissent. Fais seulement les zones ouvertes, surtout le devant où mangent les corydoras.",
  },
  {
    when: 'Avec des crevettes',
    action:
      "Mets un bas fin ou une maille sur l'embout du tuyau : les bébés crevettes se font aspirer. Regarde le seau avant de le vider.",
  },
  {
    when: 'Jamais le même jour que les mousses',
    action:
      "Ne siphonne pas et ne rince pas une mousse du filtre le même jour : tu retirerais des bactéries aux deux endroits à la fois.",
  },
];
