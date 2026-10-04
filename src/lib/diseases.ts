// Fiches maladies d'aquarium : repères d'aquariophilie, pas un avis vétérinaire.
// Les doses précises dépendent du produit : on renvoie toujours à la notice.

export type DiseaseGroup = 'fish' | 'invertebrate' | 'plant' | 'water';
export type DiseaseKind = 'parasite' | 'bacterie' | 'champignon' | 'virus' | 'environnement' | 'carence';
export type DiseaseSeverity = 'low' | 'medium' | 'high' | 'urgent';

export interface Disease {
  id: string;
  name: string;
  aliases: string[]; // autres noms et mots-clés pour retrouver la fiche
  cause: string; // agent responsable, en une ligne
  group: DiseaseGroup;
  kind: DiseaseKind;
  severity: DiseaseSeverity;
  contagious: boolean;
  symptoms: string[];
  treatment: string[];
  caution?: string;
  prevention: string;
  duration?: string;
}

export const GROUP_LABELS: Record<DiseaseGroup, string> = {
  fish: 'Poissons',
  invertebrate: 'Crevettes et escargots',
  plant: 'Plantes',
  water: 'Eau',
};

export const KIND_LABELS: Record<DiseaseKind, string> = {
  parasite: 'Parasitaire',
  bacterie: 'Bactérienne',
  champignon: 'Fongique',
  virus: 'Virale',
  environnement: 'Environnement',
  carence: 'Carence',
};

export const SEVERITY_LABELS: Record<DiseaseSeverity, string> = {
  low: 'Faible',
  medium: 'Modérée',
  high: 'Élevée',
  urgent: 'Urgente',
};

// Règles communes à presque tous les traitements.
export const GENERAL_RULES = [
  'Teste l’eau (ammoniac, nitrites, nitrates, pH, température) avant de traiter : beaucoup de maladies viennent d’une eau dégradée.',
  'Isole le malade dans un bac de quarantaine quand c’est possible : on traite plus fort, sans polluer le bac principal ni toucher aux crevettes et aux plantes.',
  'Retire le charbon actif et la résine du filtre pendant un traitement : ils absorbent le médicament.',
  'Aère davantage : beaucoup de traitements et la chaleur réduisent l’oxygène dissous.',
  'Respecte la notice du produit (dose, durée) et ne mélange pas les médicaments.',
  'Les crevettes, escargots et plantes supportent mal le cuivre et plusieurs antiparasitaires : sors-les ou choisis un produit compatible.',
  'Les poissons sans écailles (corydoras, loches, pléco) sont sensibles au sel, au cuivre et au vert de malachite : réduis les doses.',
];

export const DISEASES: Disease[] = [
  {
    id: 'ich',
    name: 'Points blancs (Ich)',
    aliases: ['ichthyophthirius', 'ich', 'points blancs', 'grains de sel', 'ichtyo'],
    cause: 'Parasite cilié Ichthyophthirius multifiliis, favorisé par le stress et les chutes de température',
    group: 'fish',
    kind: 'parasite',
    severity: 'high',
    contagious: true,
    symptoms: [
      'Petits points blancs sur le corps et les nageoires, comme des grains de sel',
      'Poisson qui se frotte contre le décor',
      'Nageoires serrées, respiration rapide, perte d’appétit',
    ],
    treatment: [
      'Traite tout le bac : le parasite libre nage dans l’eau, il ne suffit pas d’isoler un poisson.',
      'Monte la température progressivement vers 28 à 30 °C si les espèces la supportent, et maintiens-la 10 à 14 jours : le cycle du parasite s’accélère et il devient vulnérable.',
      'Ajoute un antiparasitaire du commerce « points blancs » (vert de malachite, formol ou équivalent selon le produit) en suivant la notice.',
      'Aspire le sol chaque jour et change un peu d’eau avant de redoser : les kystes tombent au fond.',
      'Continue 3 jours après la disparition des points.',
    ],
    caution: 'Sel et chaleur ne conviennent pas à tous : évite le sel avec corydoras, loches, plantes et invertébrés.',
    prevention: 'Quarantaine de 2 à 4 semaines pour tout nouvel arrivant, température stable, pas de stress.',
    duration: '10 à 14 jours',
  },
  {
    id: 'velours',
    name: 'Maladie du velours (Oodinium)',
    aliases: ['oodinium', 'piscinoodinium', 'velours', 'poussière dorée', 'rouille'],
    cause: 'Parasite Piscinoodinium pillulare, qui se fixe sur la peau et les branchies',
    group: 'fish',
    kind: 'parasite',
    severity: 'high',
    contagious: true,
    symptoms: [
      'Fine poussière dorée ou rouille sur le corps, visible à la lumière',
      'Respiration rapide, poisson qui reste à la surface',
      'Nageoires collées, frottements',
    ],
    treatment: [
      'Éteins la lumière 2 à 3 jours : le parasite a besoin d’énergie lumineuse.',
      'Monte la température vers 28 °C et aère fortement.',
      'Utilise un médicament antiparasitaire adapté (cuivre ou équivalent selon la notice) en bac de traitement.',
      'Change l’eau et aspire le sol avant de redoser.',
    ],
    caution: 'Le cuivre tue les invertébrés et abîme les plantes : traite le malade seul.',
    prevention: 'Quarantaine, eau propre, évite les variations de température.',
    duration: '7 à 14 jours',
  },
  {
    id: 'columnaris',
    name: 'Bouche de coton (Columnaris)',
    aliases: ['columnaris', 'flavobacterium', 'bouche de coton', 'champignon bouche', 'peau blanche'],
    cause: 'Bactérie Flavobacterium columnare, très rapide dans l’eau chaude et chargée',
    group: 'fish',
    kind: 'bacterie',
    severity: 'urgent',
    contagious: true,
    symptoms: [
      'Plaques blanches ou grises cotonneuses autour de la bouche ou sur le corps',
      'Ulcères, nageoires rongées, branchies pâles',
      'Évolue en quelques jours',
    ],
    treatment: [
      'Isole les malades et fais un grand changement d’eau.',
      'Utilise un antibactérien à large spectre adapté (selon la notice ou l’avis d’un vétérinaire pour poissons).',
      'Baisse un peu la température et aère.',
      'Retire les poissons morts tout de suite.',
    ],
    caution: 'À confirmer avec un vétérinaire ou un aquariophile expérimenté : le diagnostic est facile à confondre avec un champignon.',
    prevention: 'Eau de qualité, densité raisonnable, quarantaine.',
    duration: '5 à 10 jours',
  },
  {
    id: 'pourriture-nageoires',
    name: 'Pourriture des nageoires',
    aliases: ['fin rot', 'nageoires', 'nageoires rongées', 'nageoires déchirées'],
    cause: 'Bactéries opportunistes (Aeromonas, Pseudomonas…) sur des nageoires fragilisées par une eau dégradée ou des agressions',
    group: 'fish',
    kind: 'bacterie',
    severity: 'medium',
    contagious: false,
    symptoms: [
      'Nageoires effilochées, bords blancs ou rouges, qui raccourcissent',
      'Poisson apathique, parfois collé au fond',
    ],
    treatment: [
      'Corrige d’abord l’eau : changes d’eau réguliers de 30 %, ammoniac et nitrites à 0.',
      'Sépare le poisson s’il est harcelé par les autres.',
      'Si ça progresse, traite avec un antibactérien du commerce adapté, selon la notice.',
      'Les nageoires repoussent quand la cause est supprimée.',
    ],
    prevention: 'Eau stable et propre, pas de congénères agressifs, décor sans arêtes.',
    duration: '1 à 3 semaines',
  },
  {
    id: 'hydropisie',
    name: 'Hydropisie (écailles en pomme de pin)',
    aliases: ['dropsy', 'hydropisie', 'pomme de pin', 'ventre gonflé', 'écailles hérissées'],
    cause: 'Infection bactérienne interne (reins, liquide dans le corps), souvent liée au stress et à une eau dégradée',
    group: 'fish',
    kind: 'bacterie',
    severity: 'urgent',
    contagious: false,
    symptoms: [
      'Ventre très gonflé, écailles qui se soulèvent comme une pomme de pin',
      'Yeux exorbités, apathie, refus de manger',
    ],
    treatment: [
      'Isole le poisson dans un bac de quarantaine, eau propre et calme.',
      'Bain de sel d’Epsom ou traitement antibactérien selon la notice, idéalement avec l’avis d’un vétérinaire.',
      'Nourris très légèrement ou jeûne un à deux jours.',
    ],
    caution: 'Pronostic réservé : à un stade avancé, l’euthanasie douce est parfois la seule option humaine.',
    prevention: 'Eau propre, alimentation variée, quarantaine.',
    duration: 'souvent sans issue si avancé',
  },
  {
    id: 'mycose',
    name: 'Champignons (Saprolegnia)',
    aliases: ['saprolegnia', 'champignon', 'mycose', 'ouate', 'coton blanc'],
    cause: 'Champignons aquatiques qui colonisent des plaies ou des œufs morts',
    group: 'fish',
    kind: 'champignon',
    severity: 'medium',
    contagious: false,
    symptoms: ['Touffes blanches cotonneuses sur une plaie, une nageoire ou des œufs', 'Poisson amaigri ou blessé'],
    treatment: [
      'Soigne la cause : plaie, mauvaise qualité d’eau.',
      'Bains localisés ou traitement antifongique du commerce, selon la notice.',
      'Retire les œufs infertiles ou les poissons morts.',
    ],
    prevention: 'Eau propre, pas de blessures (décor lisse), retrait des morts.',
    duration: '5 à 10 jours',
  },
  {
    id: 'camallanus',
    name: 'Vers rouges (Camallanus)',
    aliases: ['camallanus', 'vers', 'vers rouges', 'anus', 'parasites intestinaux'],
    cause: 'Nématode intestinal dont l’extrémité rouge dépasse de l’anus',
    group: 'fish',
    kind: 'parasite',
    severity: 'high',
    contagious: true,
    symptoms: ['Fins vers rouges sortant de l’anus', 'Amaigrissement malgré l’appétit', 'Selles filamenteuses'],
    treatment: [
      'Traite tout le bac avec un vermifuge pour poissons (lévamisole, fenbendazole ou équivalent selon la notice).',
      'Répète le traitement après 7 à 10 jours : les œufs ne sont pas tous touchés.',
      'Aspire le fond après chaque traitement.',
    ],
    caution: 'Ces produits peuvent être toxiques pour les invertébrés : sors-les avant.',
    prevention: 'Quarantaine, évite les poissons sauvages ou de provenance douteuse.',
    duration: '2 à 3 semaines',
  },
  {
    id: 'hexamita',
    name: 'Maladie du trou (Hexamita)',
    aliases: ['hexamita', 'spironucleus', 'trou dans la tête', 'hole in the head', 'discus', 'cichlidé'],
    cause: 'Flagellés intestinaux (Hexamita, Spironucleus), fréquent chez cichlidés et discus',
    group: 'fish',
    kind: 'parasite',
    severity: 'high',
    contagious: true,
    symptoms: ['Petits trous ou creux sur la tête et la ligne latérale', 'Selles blanches et filamenteuses', 'Amaigrissement, couleurs ternes'],
    treatment: [
      'Améliore l’eau et l’alimentation (vivre et vitaminée).',
      'Traitement au métronidazole (en bain ou mélangé à la nourriture), selon la notice ou l’avis d’un vétérinaire.',
      'Maintiens 5 à 10 jours.',
    ],
    prevention: 'Eau propre, nourriture variée, quarantaine.',
    duration: '1 à 2 semaines',
  },
  {
    id: 'vers-branchiaux',
    name: 'Vers branchiaux et de peau (Dactylogyrus, Gyrodactylus)',
    aliases: ['dactylogyrus', 'gyrodactylus', 'trématodes', 'vers branchiaux', 'frottements', 'branchies'],
    cause: 'Trématodes monogènes qui se fixent sur les branchies ou la peau',
    group: 'fish',
    kind: 'parasite',
    severity: 'medium',
    contagious: true,
    symptoms: ['Poisson qui se frotte, saute ou gratte', 'Respiration rapide, branchies entrouvertes', 'Mucus excessif, peau terne'],
    treatment: [
      'Traitement antiparasitaire au praziquantel ou équivalent, selon la notice.',
      'Répète après 7 à 10 jours.',
      'Aère bien et améliore l’eau.',
    ],
    caution: 'Les invertébrés peuvent être sensibles à certains produits.',
    prevention: 'Quarantaine, ne pas introduire d’eau ou de plantes douteuses sans trempage.',
    duration: '2 semaines',
  },
  {
    id: 'costia',
    name: 'Costia (Ichthyobodo)',
    aliases: ['costia', 'ichthyobodo', 'voile bleuâtre', 'mucus', 'peau grise'],
    cause: 'Flagellé qui attaque la peau et les branchies, surtout sur poissons stressés ou affaiblis',
    group: 'fish',
    kind: 'parasite',
    severity: 'medium',
    contagious: true,
    symptoms: ['Voile gris-bleu sur la peau', 'Nageoires collées, frottements', 'Respiration rapide'],
    treatment: [
      'Traitement antiparasitaire du commerce adapté aux protozoaires, selon la notice.',
      'Chaleur douce et aération.',
      'Améliore l’eau et réduis le stress.',
    ],
    prevention: 'Eau stable, quarantaine.',
    duration: '7 à 10 jours',
  },
  {
    id: 'hemorragique',
    name: 'Septicémie / ulcères',
    aliases: ['aeromonas', 'septicémie', 'ulcère', 'stries rouges', 'plaies', 'rougeurs'],
    cause: 'Infection bactérienne (Aeromonas, Pseudomonas) souvent sur terrain stressé',
    group: 'fish',
    kind: 'bacterie',
    severity: 'urgent',
    contagious: true,
    symptoms: ['Stries ou taches rouges sur le corps et les nageoires', 'Ulcères ouverts', 'Apathie, perte d’appétit'],
    treatment: [
      'Isole le poisson et améliore immédiatement l’eau.',
      'Antibactérien adapté, selon la notice ou l’avis d’un vétérinaire.',
      'Désinfecte le matériel utilisé.',
    ],
    caution: 'Gravité élevée : à confirmer avec un vétérinaire ou un aquariophile expérimenté.',
    prevention: 'Eau propre, densité raisonnable, alimentation variée.',
    duration: '7 à 10 jours',
  },
  {
    id: 'lymphocystis',
    name: 'Lymphocystis',
    aliases: ['lymphocystis', 'verrues', 'chou-fleur', 'nodules', 'virus'],
    cause: 'Virus qui provoque des amas de cellules sur la peau et les nageoires',
    group: 'fish',
    kind: 'virus',
    severity: 'low',
    contagious: true,
    symptoms: ['Nodules blancs en chou-fleur sur les nageoires ou la peau', 'Poisson souvent actif et mangeant normalement'],
    treatment: [
      'Aucun médicament ne guérit le virus.',
      'Eau parfaite, bonne alimentation, peu de stress : les nodules disparaissent souvent en quelques semaines.',
      'Isole le poisson si les autres sont sensibles.',
    ],
    prevention: 'Réduire le stress, quarantaine.',
    duration: '3 à 8 semaines',
  },
  {
    id: 'mycobacteriose',
    name: 'Tuberculose des poissons (mycobactériose)',
    aliases: ['mycobacterium', 'tuberculose', 'amaigrissement', 'maigre', 'ventre creux'],
    cause: 'Bactéries du genre Mycobacterium, transmissibles à l’homme par une plaie',
    group: 'fish',
    kind: 'bacterie',
    severity: 'high',
    contagious: true,
    symptoms: ['Amaigrissement chronique malgré l’appétit', 'Ulcères, perte de couleur, colonne déformée', 'Mort lente de plusieurs poissons'],
    treatment: [
      'Aucun traitement fiable à la maison.',
      'Isole et, selon l’avis d’un vétérinaire, euthanasie les poissons atteints.',
      'Porte des gants pour les manipulations et désinfecte le matériel.',
    ],
    caution: 'Peut infecter l’homme par une plaie : gants et lavage des mains.',
    prevention: 'Quarantaine, hygiène, eau propre.',
  },
  {
    id: 'vessie-natatoire',
    name: 'Troubles de la vessie natatoire',
    aliases: ['vessie natatoire', 'flotte', 'coule', 'nage de travers', 'swim bladder', 'constipation', 'ballonnement'],
    cause: 'Constipation, suralimentation, eau froide ou infection',
    group: 'fish',
    kind: 'environnement',
    severity: 'medium',
    contagious: false,
    symptoms: ['Poisson qui flotte ou coule', 'Nage de travers ou la tête en bas', 'Ventre gonflé'],
    treatment: [
      'Jeûne de 2 à 3 jours.',
      'Puis petite portion de pois cuit sans peau, ou nourriture riche en fibres.',
      'Température un peu plus élevée et eau propre.',
      'Si ça persiste, suspecte une infection et consulte.',
    ],
    prevention: 'Portions modérées, nourriture variée, ne pas nourrir en excès.',
    duration: '3 à 7 jours',
  },
  {
    id: 'ammoniac-nitrites',
    name: 'Intoxication ammoniac / nitrites',
    aliases: ['ammoniaque', 'nitrites', 'intoxication', 'surface', 'branchies brunes', 'sang brun', 'respiration'],
    cause: 'Cycle de l’azote déséquilibré : bac neuf, surpopulation, filtre arrêté ou nettoyé',
    group: 'water',
    kind: 'environnement',
    severity: 'urgent',
    contagious: false,
    symptoms: ['Poissons à la surface qui happent l’air', 'Branchies rouges ou brunes, nageoires collées', 'Apathie, mortalité'],
    treatment: [
      'Change 30 à 50 % de l’eau tout de suite, avec un conditionneur d’eau.',
      'Un anti-ammoniaque ou un conditionneur qui détoxifie l’ammoniaque et les nitrites aide en urgence.',
      'Aère et ne nourris pas pendant 24 à 48 h.',
      'Re-teste l’eau et répète jusqu’à 0 ammoniac et 0 nitrite.',
    ],
    prevention: 'Cyclage complet avant le peuplement, densité raisonnable, ne pas nettoyer tout le filtre en une fois.',
    duration: 'quelques jours',
  },
  {
    id: 'stress-chute-temperature',
    name: 'Stress, chocs de température ou de paramètres',
    aliases: ['stress', 'choc', 'température', 'acclimatation', 'pH'],
    cause: 'Variations rapides de température, de pH ou de dureté, ou acclimatation trop courte',
    group: 'water',
    kind: 'environnement',
    severity: 'medium',
    contagious: false,
    symptoms: ['Nageoires serrées, couleurs ternes', 'Poissons cachés ou immobiles', 'Maladies opportunistes ensuite'],
    treatment: [
      'Remets les paramètres dans la plage normale, progressivement.',
      'Réduis la lumière et le bruit, ne nourris que légèrement.',
      'Surveille : un poisson stressé attrape facilement les points blancs.',
    ],
    prevention: 'Acclimatation lente (goutte à goutte), eau d’appoint à la même température.',
  },
  {
    id: 'crevette-mue',
    name: 'Crevettes : problèmes de mue (anneau blanc)',
    aliases: ['mue', 'white ring of death', 'anneau blanc', 'crevette morte', 'crevette', 'minéraux', 'gh'],
    cause: 'Dureté (GH) et minéraux insuffisants, ou changement brutal des paramètres au moment de la mue',
    group: 'invertebrate',
    kind: 'environnement',
    severity: 'high',
    contagious: false,
    symptoms: ['Crevette morte à moitié sortie de sa mue', 'Anneau blanc entre la tête et l’abdomen', 'Mues ratées ou trop fréquentes'],
    treatment: [
      'Teste GH, KH et TDS : ajuste vers les valeurs de l’espèce.',
      'Minéralise l’eau (produit de reminéralisation pour crevettes).',
      'Évite les grands changements d’eau et les écarts de température.',
    ],
    prevention: 'Eau stable, minéraux adaptés, changes d’eau doux et réguliers.',
  },
  {
    id: 'crevette-cuivre',
    name: 'Crevettes : mort subite (cuivre, produits)',
    aliases: ['cuivre', 'pesticide', 'mort subite', 'engrais', 'traitement', 'crevettes meurent'],
    cause: 'Cuivre ou autre produit toxique : médicament, eau du robinet, engrais, plantes traitées',
    group: 'invertebrate',
    kind: 'environnement',
    severity: 'urgent',
    contagious: false,
    symptoms: ['Crevettes qui nagent en spirale, convulsent ou meurent d’un coup', 'Escargots rétractés'],
    treatment: [
      'Change 50 % de l’eau avec de l’eau traitée au conditionneur.',
      'Ajoute du charbon actif frais dans le filtre pour piéger le produit.',
      'Identifie la source : traitement récent, plante non rincée, tuyauterie en cuivre.',
    ],
    prevention: 'Rince et mets en quarantaine les plantes neuves, évite les produits à base de cuivre.',
  },
  {
    id: 'crevette-scutariella',
    name: 'Crevettes : parasites blancs (Scutariella, ciliés)',
    aliases: ['scutariella', 'vorticelle', 'vers blancs', 'ciliés', 'parasite crevette', 'crevette'],
    cause: 'Petits vers ou protozoaires fixés sur les crevettes',
    group: 'invertebrate',
    kind: 'parasite',
    severity: 'medium',
    contagious: true,
    symptoms: ['Petits vers blancs sur la tête ou les pattes', 'Duvet blanc sur la carapace', 'Crevettes qui se frottent'],
    treatment: [
      'Utilise un antiparasitaire adapté aux crevettes, selon la notice.',
      'Un bain d’eau saumâtre léger est parfois utilisé mais risqué : renseigne-toi avant.',
      'Améliore l’eau et réduis la densité.',
    ],
    caution: 'Beaucoup de produits pour poissons tuent les crevettes.',
    prevention: 'Quarantaine des crevettes neuves, eau propre.',
  },
  {
    id: 'escargot-coquille',
    name: 'Escargots : coquille érodée ou trouée',
    aliases: ['coquille', 'escargot', 'érosion', 'calcium', 'acidité', 'mollusque'],
    cause: 'Eau trop acide ou trop douce, manque de calcium',
    group: 'invertebrate',
    kind: 'carence',
    severity: 'low',
    contagious: false,
    symptoms: ['Coquille rongée, trouée ou blanchie', 'Croissance lente'],
    treatment: [
      'Teste pH, KH et GH, et remonte la dureté si besoin.',
      'Ajoute une source de calcium (coquilles écrasées, os de seiche, aliment riche en calcium).',
    ],
    prevention: 'Eau minéralisée, alimentation variée.',
  },
  {
    id: 'crypto-melt',
    name: 'Fonte des cryptocorynes',
    aliases: ['crypto melt', 'fonte', 'cryptocoryne', 'feuilles fondent', 'plante qui fond'],
    cause: 'Changement de conditions (lumière, eau, substrat) après achat ou déplacement',
    group: 'plant',
    kind: 'environnement',
    severity: 'low',
    contagious: false,
    symptoms: ['Feuilles qui deviennent translucides puis fondent', 'Plante qui semble mourir après un changement'],
    treatment: [
      'Ne déplace plus la plante : laisse-la s’adapter.',
      'Coupe les feuilles mortes, la plante repart du pied en quelques semaines.',
      'Garde des paramètres stables et un sol nutritif.',
    ],
    prevention: 'Évite de les déplacer, stabilise le bac.',
  },
  {
    id: 'carence-plantes',
    name: 'Carences des plantes (fer, potassium, azote)',
    aliases: ['chlorose', 'carence', 'feuilles jaunes', 'trous', 'engrais', 'fer', 'potassium', 'azote'],
    cause: 'Nutriments insuffisants par rapport à l’éclairage et à la croissance',
    group: 'plant',
    kind: 'carence',
    severity: 'low',
    contagious: false,
    symptoms: [
      'Jeunes feuilles jaunes aux nervures vertes : manque de fer',
      'Petits trous et bords brûlés : manque de potassium',
      'Vieilles feuilles pâles : manque d’azote',
    ],
    treatment: [
      'Ajoute un engrais liquide complet, ou le nutriment en cause, en petites doses régulières.',
      'Équilibre éclairage, CO₂ et fertilisation : trop de lumière sans engrais fait carencer.',
      'Retire les feuilles très abîmées.',
    ],
    prevention: 'Fertilisation régulière, tests de nitrates, éclairage mesuré.',
  },
];

export const DISEASE_NAMES = DISEASES.map((d) => d.name);

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Retrouve la fiche qui correspond le mieux à un nom de condition (diagnostic IA).
export function findDisease(text: string): Disease | null {
  const t = norm(text);
  let best: { d: Disease; score: number } | null = null;
  for (const d of DISEASES) {
    let score = 0;
    if (t.includes(norm(d.name))) score += 5;
    for (const a of d.aliases) if (t.includes(norm(a))) score += a.length > 5 ? 3 : 1;
    if (score > 0 && (!best || score > best.score)) best = { d, score };
  }
  return best && best.score >= 2 ? best.d : null;
}

export function searchDiseases(query: string): Disease[] {
  const q = norm(query).trim();
  if (!q) return DISEASES;
  return DISEASES.filter((d) =>
    norm([d.name, ...d.aliases, d.cause, ...d.symptoms].join(' ')).includes(q)
  );
}
