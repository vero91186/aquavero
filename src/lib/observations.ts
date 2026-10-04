// Autres observations dans un bac : œufs, jeunes, algues, bestioles. Repères d'aquariophilie.

export type ObsGroup = 'oeufs' | 'algues' | 'bestioles' | 'autre';
export type ObsRisk = 'none' | 'watch' | 'act';

export interface Observation {
  id: string;
  name: string;
  group: ObsGroup;
  aliases: string[];
  looks: string; // à quoi ça ressemble
  meaning: string; // ce que c'est et pourquoi c'est là
  risk: ObsRisk;
  actions: string[];
}

export const OBS_GROUP_LABELS: Record<ObsGroup, string> = {
  oeufs: 'Œufs et jeunes',
  algues: 'Algues et dépôts',
  bestioles: 'Bestioles',
  autre: 'Autre',
};

export const OBS_RISK_LABELS: Record<ObsRisk, string> = {
  none: 'Sans danger',
  watch: 'À surveiller',
  act: 'À traiter',
};

export const OBSERVATIONS: Observation[] = [
  {
    id: 'oeufs-poisson',
    name: 'Œufs de poisson (ponte)',
    group: 'oeufs',
    aliases: ['ponte', 'oeufs', 'œufs', 'perles', 'billes', 'grains', 'frai'],
    looks: 'Petites billes translucides ou jaunâtres, collées sur les feuilles, la vitre, une grotte ou un pot de fleurs.',
    meaning: 'Ponte de ton poisson. Les œufs fécondés restent clairs ; ceux qui deviennent blancs et cotonneux sont infertiles ou moisis.',
    risk: 'none',
    actions: [
      'Laisse-les en place si les parents sont tranquilles : beaucoup de poissons mangent leurs œufs.',
      'Pour sauver les œufs, déplace le support (feuille, grotte) dans un petit bac propre à la même eau, avec aération douce.',
      'Retire les œufs blancs et cotonneux pour éviter que le champignon se propage.',
      'Prévois à manger très fin (nauplies, poudre) pour les alevins à l’éclosion, 2 à 5 jours après la ponte.',
    ],
  },
  {
    id: 'oeufs-crevette',
    name: 'Œufs de crevette (femelle grainée)',
    group: 'oeufs',
    aliases: ['crevette grainée', 'selle', 'oeufs crevette', 'porte les oeufs', 'ovigère', 'sous le ventre'],
    looks: 'Petits grains verts, jaunes ou bruns sous la queue de la femelle, qu’elle ventile en permanence.',
    meaning: 'Femelle ovigère : elle porte ses œufs pendant 3 à 4 semaines, jusqu’à l’éclosion de mini-crevettes.',
    risk: 'none',
    actions: [
      'Ne la déplace pas et évite les grands changements d’eau ou de température.',
      'Donne des cachettes (mousse, plantes touffues) pour les bébés.',
      'Protège l’aspiration du filtre avec une éponge.',
    ],
  },
  {
    id: 'oeufs-escargot',
    name: 'Œufs d’escargot (physes, planorbes)',
    group: 'oeufs',
    aliases: ['escargot', 'gelée', 'masse gélatineuse', 'physe', 'planorbe', 'oeufs escargots'],
    looks: 'Petite masse de gelée transparente collée sur la vitre ou les feuilles, avec de minuscules points à l’intérieur.',
    meaning: 'Ponte d’escargots communs. Ils prolifèrent si le bac est trop nourri.',
    risk: 'watch',
    actions: [
      'Enlève les masses à la main si tu veux limiter la population.',
      'Réduis la nourriture : la prolifération suit les restes.',
      'Un Clea (escargot assassin) régule les populations.',
    ],
  },
  {
    id: 'oeufs-pomacea',
    name: 'Œufs d’escargot pomme (Pomacea) hors de l’eau',
    group: 'oeufs',
    aliases: ['pomacea', 'oeufs roses', 'ponte rose', 'escargot pomme', 'grappe rose'],
    looks: 'Amas rose ou orangé en forme de grappe, posé au-dessus de la ligne d’eau, sur la vitre ou le couvercle.',
    meaning: 'Ponte d’escargot pomme. Elle éclot au bout de 2 à 4 semaines.',
    risk: 'watch',
    actions: [
      'Laisse sécher ou retire la ponte si tu ne veux pas d’une nouvelle génération.',
      'Garde le niveau d’eau stable pour ne pas la mouiller.',
    ],
  },
  {
    id: 'alevins',
    name: 'Alevins et jeunes crevettes',
    group: 'oeufs',
    aliases: ['alevin', 'bébé', 'bébés', 'petits poissons', 'fretin', 'naissain', 'mini crevettes'],
    looks: 'Minuscules poissons ou crevettes de quelques millimètres, qui se cachent dans les plantes et le décor.',
    meaning: 'Naissances dans le bac : vivipares (guppy, platy), poissons pondeurs ou crevettes.',
    risk: 'watch',
    actions: [
      'Donne des cachettes (mousse de Java, plantes touffues) et des petites portions de nourriture adaptées.',
      'Sépare-les dans un petit bac si les adultes les mangent.',
      'Prévois la place : une reproduction non maîtrisée fait vite monter la densité.',
    ],
  },
  {
    id: 'diatomees',
    name: 'Diatomées (poussière brune)',
    group: 'algues',
    aliases: ['diatomée', 'poussière brune', 'dépôt brun', 'voile brun', 'algues brunes'],
    looks: 'Dépôt brun poudreux sur le sol, les vitres et les feuilles, qui s’enlève au doigt.',
    meaning: 'Très fréquent dans un bac neuf : silicates et nutriments en excès pendant la maturation.',
    risk: 'none',
    actions: [
      'Essuie-les, aspire-les, ils disparaissent souvent seuls en quelques semaines.',
      'Ajoute des Otocinclus, des Neritina ou des crevettes algivores.',
      'Garde un éclairage à 6 à 8 h par jour.',
    ],
  },
  {
    id: 'algues-vertes',
    name: 'Algues vertes sur la vitre',
    group: 'algues',
    aliases: ['algues vertes', 'points verts', 'vitre verte', 'taches vertes'],
    looks: 'Petits points verts durs sur la vitre et les feuilles âgées, ou voile vert.',
    meaning: 'Trop de lumière ou de nutriments (nitrates, phosphates) par rapport aux plantes.',
    risk: 'watch',
    actions: [
      'Gratte la vitre avec une lame ou un aimant.',
      'Réduis l’éclairage (6 à 7 h) et vérifie nitrates et phosphates.',
      'Ajoute des plantes à croissance rapide.',
    ],
  },
  {
    id: 'algues-filamenteuses',
    name: 'Algues filamenteuses (en cheveux)',
    group: 'algues',
    aliases: ['filaments', 'cheveux', 'algue cheveux', 'barbe', 'spirogyre', 'cladophora'],
    looks: 'Filaments verts qui s’enroulent autour des plantes et du décor, comme des cheveux.',
    meaning: 'Déséquilibre entre lumière, nutriments et CO₂, ou carence en fertilisation.',
    risk: 'watch',
    actions: [
      'Retire-les à la main avec une brosse à dents ou un bâton.',
      'Stabilise la fertilisation et réduis la durée d’éclairage.',
      'Fais des changes d’eau réguliers et vérifie le CO₂ si tu en injectes.',
    ],
  },
  {
    id: 'algues-brosse',
    name: 'Algues brosse (noires)',
    group: 'algues',
    aliases: ['algue noire', 'brosse', 'barbe noire', 'bba', 'black beard'],
    looks: 'Touffes noires ou gris foncé sur les bords des feuilles, le bois et les roches.',
    meaning: 'Variations du CO₂ ou courant insuffisant, plus de nutriments instables.',
    risk: 'watch',
    actions: [
      'Stabilise le CO₂ et améliore le brassage.',
      'Traite localement avec un produit à base de carbone liquide ou d’eau oxygénée, selon la notice.',
      'Retire les feuilles trop touchées.',
    ],
  },
  {
    id: 'cyanobacteries',
    name: 'Cyanobactéries (tapis vert-bleu)',
    group: 'algues',
    aliases: ['cyano', 'algue bleue', 'tapis', 'mucus vert', 'odeur de terre', 'visqueux'],
    looks: 'Tapis visqueux vert-bleu ou rouge, odeur de terre, qui se retire en voile.',
    meaning: 'Eau stagnante, nutriments en excès ou nitrates trop bas, parfois sol mal entretenu.',
    risk: 'act',
    actions: [
      'Retire-les à la main et aspire-les, change l’eau.',
      'Améliore le brassage et réduis la lumière.',
      'Rééquilibre les nitrates et la fertilisation.',
      'En dernier recours, un traitement antibactérien du commerce, selon la notice (attention aux plantes et invertébrés).',
    ],
  },
  {
    id: 'biofilm',
    name: 'Biofilm blanc ou mousse sur le bois',
    group: 'algues',
    aliases: ['biofilm', 'moisissure', 'toile blanche', 'filaments blancs', 'bois', 'champignon bois', 'pellicule'],
    looks: 'Film gris-blanc ou filaments blancs sur un bois, un décor neuf ou la surface de l’eau.',
    meaning: 'Colonie de bactéries et de champignons qui mange la matière organique d’un décor neuf. Inoffensif.',
    risk: 'none',
    actions: [
      'Laisse-le disparaître seul en 2 à 4 semaines, ou brosse-le.',
      'Les crevettes, escargots et Ancistrus le mangent volontiers.',
      'Pour la pellicule de surface, ajoute un peu de brassage en surface.',
    ],
  },
  {
    id: 'planaires',
    name: 'Planaires',
    group: 'bestioles',
    aliases: ['planaire', 'ver plat', 'vers plats', 'ver blanc', 'ver qui glisse'],
    looks: 'Petits vers plats à tête triangulaire, blancs ou bruns, qui glissent sur la vitre et sortent la nuit.',
    meaning: 'Prolifèrent avec la suralimentation. Inoffensifs pour les poissons, mais ils mangent les petits invertébrés et les œufs.',
    risk: 'watch',
    actions: [
      'Réduis la nourriture et aspire le fond.',
      'Piège-les avec un morceau de viande ou de crevette posé la nuit, puis retire-le le matin.',
      'En cas d’invasion, traitement antiparasitaire du commerce, selon la notice (toxique pour les crevettes).',
    ],
  },
  {
    id: 'hydres',
    name: 'Hydres',
    group: 'bestioles',
    aliases: ['hydre', 'polype', 'tentacules', 'petite méduse', 'hydra'],
    looks: 'Petits polypes verts ou blancs de 1 cm, à tentacules, accrochés à la vitre ou aux feuilles.',
    meaning: 'Chasseurs de bébés crevettes et d’alevins. Arrivent souvent par les plantes ou la nourriture vivante.',
    risk: 'watch',
    actions: [
      'Retire-les à la pince et plonge les plantes douteuses avant de les introduire.',
      'Un poisson hydrophage (gourami, poisson paradis) en mange.',
      'En cas d’invasion, traitement antiparasitaire adapté, selon la notice, après avoir sorti les invertébrés.',
    ],
  },
  {
    id: 'vers-detritus',
    name: 'Vers blancs fins (nématodes, vers de vase)',
    group: 'bestioles',
    aliases: ['ver blanc', 'nématode', 'vers fins', 'vers de vase', 'tubifex', 'vermisseaux'],
    looks: 'Petits vers blancs très fins qui ondulent dans le sol ou contre la vitre.',
    meaning: 'Décomposeurs de la matière organique. Un signe de sol riche en détritus, rarement un souci.',
    risk: 'none',
    actions: ['Aspire le sol plus souvent.', 'Réduis un peu la nourriture.'],
  },
  {
    id: 'copepodes',
    name: 'Copépodes, daphnies, cyclops',
    group: 'bestioles',
    aliases: ['copépode', 'cyclops', 'daphnie', 'puce', 'puces d’eau', 'point qui saute', 'ostracode'],
    looks: 'Points blancs qui sautent dans l’eau ou rampent sur la vitre, de 1 à 3 mm.',
    meaning: 'Petits crustacés d’eau douce, nourriture naturelle de beaucoup de poissons et d’alevins.',
    risk: 'none',
    actions: ['Rien à faire : ils sont même utiles.'],
  },
  {
    id: 'sangsues',
    name: 'Sangsues et larves',
    group: 'bestioles',
    aliases: ['sangsue', 'larve', 'larves', 'moustique', 'ver rouge', 'chironome'],
    looks: 'Petite larve ou ver rouge ou brun qui nage ou se tortille, parfois en surface.',
    meaning: 'Larves de moustique ou de chironome arrivées avec une plante : inoffensives, mangées par les poissons. Une vraie sangsue est rare.',
    risk: 'none',
    actions: ['Laisse les poissons les manger.', 'Si c’est une sangsue, retire-la et plonge les plantes avant introduction.'],
  },
  {
    id: 'inconnu-blanc',
    name: 'Tache ou dépôt blanc sur un animal',
    group: 'autre',
    aliases: ['blanc', 'tache', 'dépôt', 'duvet', 'coton'],
    looks: 'Points, duvet ou plaques blanches sur le corps d’un poisson ou d’une crevette.',
    meaning: 'Peut être des points blancs (Ich), un champignon ou une bactérie : à regarder de près.',
    risk: 'act',
    actions: [
      'Ouvre l’onglet Scanner un symptôme et envoie une photo nette.',
      'Compare avec la liste des maladies (Ich, Columnaris, champignons, vers de crevette).',
    ],
  },
];

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function findObservation(text: string): Observation | null {
  const t = norm(text);
  let best: { o: Observation; score: number } | null = null;
  for (const o of OBSERVATIONS) {
    let score = 0;
    if (t.includes(norm(o.name))) score += 5;
    for (const a of o.aliases) if (t.includes(norm(a))) score += a.length > 5 ? 3 : 1;
    if (score > 0 && (!best || score > best.score)) best = { o, score };
  }
  return best && best.score >= 2 ? best.o : null;
}

export function searchObservations(query: string): Observation[] {
  const q = norm(query).trim();
  if (!q) return OBSERVATIONS;
  return OBSERVATIONS.filter((o) => norm([o.name, ...o.aliases, o.looks, o.meaning].join(' ')).includes(q));
}
