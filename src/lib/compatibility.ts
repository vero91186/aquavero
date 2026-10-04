import type { DensityLine } from "@/lib/density";
import { SPECIES_CATALOG } from "@/lib/species-catalog";

// Évaluation des incompatibilités entre les espèces d'un peuplement : prédation,
// harcèlement des nageoires, territorialité, paramètres d'eau opposés, eau douce
// contre eau de mer, escargots et plantes. Ce sont des repères d'aquariophilie,
// pas des certitudes : le caractère varie d'un individu à l'autre.
export type CompatLevel = "danger" | "warning" | "info";

export interface CompatIssue {
  level: CompatLevel;
  title: string;
  detail: string;
  fix: string;
  names: string[]; // espèces concernées
}

const txt = (l: DensityLine) =>
  `${l.name} ${l.scientificName ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const MARINE =
  /amphiprion|paracanthurus|chrysiptera|lysmata|discosoma|clown ocellaris|chirurgien|demoiselle|corail|nettoyeuse/;
const SHRIMP =
  /caridina|neocaridina|atyopsis|atya |atya$|palaemonetes|crevette|lysmata/;
const CRAYFISH = /cambarellus|ecrevisse/;
const SNAIL =
  /neritina|clithon|vittina|neripteron|planorb|physe|physa|pomacea|marisa|bellamya|tylomelania|melanoides|anentome|brotia|escargot|clea/;
const PLANT_EATING_SNAIL = /pomacea|marisa|escargot pomme/;
const HARMLESS_FISH =
  /otocinclus|ancistrus|corydoras|aspidoras|brochis|dianema|scleromystax|pangio|farlowella|rineloricaria|parotocinclus|peckoltia|hypancistrus|gasteropelecus|carnegiella|kryptopterus|nannostomus|copella|boraras|sundadanio|microdevario|axelrodia|symphysodon|discus|crossocheilus|siamois|chilodus|characidium|rhinogobius|gobie|tateurndina|boraras/;
const STRONG_PREDATOR =
  /pterophyllum|scalaire|pimelodus|aplocheilus|pachypanchax|devario aequipinnatus|danio geant|cichlid|macropodus|paradis|aphyosemion|fundulopanchax|killi/;
const SHRIMP_HUNTER =
  /pterophyllum|scalaire|pimelodus|aplocheilus|pachypanchax|botia|yasuhikotakia|macropodus|paradis|cichlid|apistogramma|pelvicachromis|laetacara|cleithracara|nannacara|mikrogeophagus|ram |betta|combattant|trichopodus|trichogaster|gourami|sphaerichthys|tetrazona|barbodes|puntigrus|devario|melanotaenia|killi|aphyosemion|fundulopanchax|badis|dario|symphysodon|discus|carinotetraodon|globe|chromobotia|microctenopoma|neolamprologus/;
const NIPPER =
  /tetrazona|puntigrus|barbodes tetrazona|barbus tigre|barbus de sumatra|desmopuntius|pentazona|hyphessobrycon eques|serpae|gymnocorymbus|veuve|bande noire|anisitsi|buenos aires|moenkhausia sanctaefilomenae|yeux rouges|pethia conchonius|barbus rose|carinotetraodon|gyrinocheilus/;
const LONGFIN =
  /betta|combattant|pterophyllum|scalaire|symphysodon|discus|poecilia reticulata|guppy|trichopodus|trichogaster|gourami|poecilia velifera|molly voile|macropodus|iriatherina|xiphophorus hellerii|porte-epee/;
const LABYRINTH =
  /betta|combattant|trichopodus|trichogaster|gourami|macropodus|paradis|trichopsis|sphaerichthys|malpulutta|ctenopoma|parosphromenus/;
const DWARF_CICHLID =
  /apistogramma|pelvicachromis|nannacara|laetacara|cleithracara|mikrogeophagus|ram |nanochromis|taeniacara|dicrossus/;
const ACTIVE =
  /danio rerio|danio zebre|danio leopard|devario|danio albolineatus|danio perle|tetrazona|puntigrus|barbodes|melanotaenia|pethia conchonius|tanichthys/;
const SHY =
  /symphysodon|discus|betta|combattant|sphaerichthys|trichopsis|dario|iriatherina|pterophyllum|scalaire/;
// Température
const HOT = /symphysodon|discus/;
const COOL =
  /tanichthys|neon chinois|oryzias|medaka|corydoras paleatus|poivre|carassius|macropodus|paradis|danio margaritatus/;
// Eau douce et acide contre dure et alcaline
const SOFT =
  /paracheirodon axelrodi|cardinalis|hemigrammus rhodostomus|rummy|petitella|apistogramma|symphysodon|discus|cantonensis|logemanni|dennerli|cristal|crystal|taiwan|blue bolt|red nose|sulawesi|shadow panda|red wine|sphaerichthys|axelrodia|dicrossus|dario|mikrogeophagus ramirezi|ram papillon|nannostomus|hyphessobrycon rosaceus|voilier|parosphromenus/;
const HARD =
  /poecilia|guppy|molly|platy|xiphophorus|limia|heterandria|xenotoca|goodeide|pachypanchax|melanotaenia|bedotia|telmatherina|porte-epee|endler|killi gardneri|aphyosemion|neolamprologus|phalloceros|nothobranchius|dermogenys/;
const CARIDINA =
  /\bcaridina (cf\. )?(cantonensis|logemanni|dennerli|gracilirostris)|cristal|crystal|taiwan|blue bolt|red nose|sulawesi|shadow panda|red wine/;
const NEOCARIDINA =
  /neocaridina|crevette (red cherry|blue dream|yellow|rili|black rose|orange sakura|bloody mary|green jade|blue velvet|snowball|carbon)/;

// Profil de comportement d'une espèce, déduit du catalogue (par nom) ou, pour
// une espèce hors catalogue, renseigné par l'IA (voir /api/ai/species-traits).
export interface SpeciesTraits {
  marine: boolean;
  shrimp: boolean;
  ghostShrimp: boolean;
  crayfish: boolean;
  snail: boolean;
  plantEatingSnail: boolean;
  assassinSnail: boolean;
  harmless: boolean; // ne s'attaque pas aux autres (loricariidés, corydoras…)
  strongPredator: boolean; // avale les poissons plus petits
  shrimpHunter: boolean;
  eatsSnails: boolean;
  nipper: boolean;
  longfin: boolean;
  labyrinth: boolean;
  betta: boolean;
  solitary: boolean; // un seul individu (ou un seul mâle) par bac
  ancistrus: boolean;
  dwarfCichlid: boolean;
  territorial: boolean;
  active: boolean;
  shy: boolean;
  hot: boolean;
  cool: boolean;
  soft: boolean;
  hard: boolean;
  caridina: boolean;
  neocaridina: boolean;
}

export type PartialTraits = Partial<SpeciesTraits>;

const stripped = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Vrai si l'espèce se trouve dans le catalogue (nom commun ou scientifique).
export function isCatalogSpecies(l: {
  name: string;
  scientificName?: string | null;
}): boolean {
  const n = stripped(l.name);
  const sci = l.scientificName ? stripped(l.scientificName) : "";
  return SPECIES_CATALOG.some(
    (c) =>
      stripped(c.commonName) === n ||
      stripped(c.scientificName) === n ||
      (sci !== "" && stripped(c.scientificName) === sci) ||
      (n.length > 4 && stripped(c.commonName).includes(n)),
  );
}

export function regexTraits(l: DensityLine): SpeciesTraits {
  const t = txt(l);
  const marine = MARINE.test(t);
  const snail = l.kind === "invertebrate" && SNAIL.test(t);
  const shrimpRe = l.kind === "invertebrate" && SHRIMP.test(t) && !snail;
  return {
    marine,
    shrimp: shrimpRe,
    ghostShrimp: /palaemonetes|fantome/.test(t),
    crayfish: l.kind === "invertebrate" && CRAYFISH.test(t),
    snail,
    plantEatingSnail: PLANT_EATING_SNAIL.test(t),
    assassinSnail: /anentome|clea|assassin/.test(t),
    harmless: HARMLESS_FISH.test(t),
    strongPredator: STRONG_PREDATOR.test(t),
    shrimpHunter: SHRIMP_HUNTER.test(t),
    eatsSnails: /botia|yasuhikotakia|chromobotia|carinotetraodon|globe/.test(t),
    nipper: NIPPER.test(t),
    longfin: LONGFIN.test(t),
    labyrinth: LABYRINTH.test(t),
    betta: /betta|combattant/.test(t),
    solitary: /betta|combattant/.test(t),
    ancistrus: /ancistrus/.test(t),
    dwarfCichlid: DWARF_CICHLID.test(t),
    territorial: false,
    active: ACTIVE.test(t),
    shy: SHY.test(t),
    hot: HOT.test(t),
    cool: COOL.test(t),
    soft: SOFT.test(t),
    hard: HARD.test(t),
    caridina: CARIDINA.test(t),
    neocaridina: NEOCARIDINA.test(t),
  };
}

const names = (ls: DensityLine[]) => Array.from(new Set(ls.map((l) => l.name)));

export function evaluateCompatibility(
  allLines: DensityLine[],
  aiTraits: Record<string, PartialTraits> = {},
): CompatIssue[] {
  const present = allLines.filter((l) => l.quantity > 0);
  const tr = new Map<DensityLine, SpeciesTraits>();
  for (const l of present) {
    const base = regexTraits(l);
    const ai = isCatalogSpecies(l) ? undefined : aiTraits[stripped(l.name)];
    tr.set(l, ai ? { ...base, ...ai } : base);
  }
  const T = (l: DensityLine) => tr.get(l) as SpeciesTraits;
  const lines = present;
  const fish = lines.filter((l) => l.kind === "fish" && !T(l).marine);
  const inverts = lines.filter(
    (l) => l.kind === "invertebrate" && !T(l).marine,
  );
  const issues: CompatIssue[] = [];
  const add = (i: CompatIssue) => issues.push(i);
  const pick = (ls: DensityLine[], f: (t: SpeciesTraits) => boolean) =>
    ls.filter((l) => f(T(l)));

  // 1. Eau douce et eau de mer
  const marine = pick(lines, (t) => t.marine);
  const fresh = lines.filter((l) => !T(l).marine);
  if (marine.length > 0 && fresh.length > 0) {
    add({
      level: "danger",
      title: "Eau de mer et eau douce mélangées",
      detail:
        "Les espèces marines ne survivent pas en eau douce, et l’inverse.",
      fix: "Sépare le peuplement : un bac d’eau douce (ton Juwel Rio) ou un bac marin, jamais les deux.",
      names: names([...marine, ...fresh]),
    });
  }

  // 2. Gros poissons contre petits poissons
  const eaten = new Map<string, { by: Set<string>; strong: boolean }>();
  for (const a of fish) {
    if (T(a).harmless || a.sizeCm <= 0) continue;
    const strong = T(a).strongPredator;
    for (const b of fish) {
      if (a === b || b.sizeCm <= 0) continue;
      const ratio = a.sizeCm / b.sizeCm;
      if (ratio >= 3.5 || (strong && ratio >= 3)) {
        const e = eaten.get(b.name) ?? { by: new Set<string>(), strong: false };
        e.by.add(a.name);
        e.strong = e.strong || strong || ratio >= 3.5;
        eaten.set(b.name, e);
      }
    }
  }
  for (const [prey, e] of eaten) {
    add({
      level: e.strong ? "danger" : "warning",
      title: `${prey} risque d’être mangé`,
      detail: `${Array.from(e.by).join(", ")} ${e.by.size > 1 ? "peuvent" : "peut"} avaler ce poisson, trop petit à côté.`,
      fix: `Choisis des poissons de taille voisine, ou retire ${prey} ou ${Array.from(e.by).join(", ")}.`,
      names: [prey, ...e.by],
    });
  }

  // 3. Crevettes et poissons chasseurs
  const shrimps = pick(inverts, (t) => t.shrimp);
  if (shrimps.length > 0) {
    const hunters = fish.filter(
      (l) => T(l).shrimpHunter || (l.sizeCm >= 9 && !T(l).harmless),
    );
    if (hunters.length > 0) {
      const strong = hunters.some(
        (l) => T(l).strongPredator || T(l).eatsSnails || l.sizeCm >= 9,
      );
      add({
        level: strong ? "danger" : "warning",
        title: "Crevettes en danger",
        detail: `${names(hunters).join(", ")} ${hunters.length > 1 ? "chassent" : "chasse"} les crevettes, au moins les jeunes${strong ? " et souvent les adultes" : ""}.`,
        fix: "Garde les crevettes avec des poissons minuscules et paisibles (Boraras, Ember, Otocinclus, Corydoras nains), avec beaucoup de mousse et de racines pour les cachettes.",
        names: [...names(shrimps), ...names(hunters)],
      });
    } else if (fish.length > 0) {
      add({
        level: "info",
        title: "Les bébés crevettes seront en partie mangés",
        detail:
          "Presque tous les poissons croquent les jeunes crevettes, même les paisibles.",
        fix: "Ajoute de la mousse de Java et des plantes touffues : une partie des petits survivra et la colonie se maintient.",
        names: [...names(shrimps), ...names(fish)].slice(0, 4),
      });
    }
  }

  // 4. Écrevisses et crevettes fantômes
  const cray = pick(inverts, (t) => t.crayfish);
  if (cray.length > 0) {
    if (shrimps.length > 0) {
      add({
        level: "danger",
        title: "Écrevisse avec des crevettes",
        detail: "Une écrevisse, même naine, attrape et mange les crevettes.",
        fix: "Écrevisses et crevettes ne vont pas dans le même bac.",
        names: [...names(cray), ...names(shrimps)],
      });
    }
    if (fish.length > 0) {
      add({
        level: "warning",
        title: "Écrevisse avec des poissons",
        detail:
          "Elle pince les nageoires et peut attraper un poisson qui dort ou un poisson lent.",
        fix: "Évite les poissons lents ou de fond, ou garde l’écrevisse seule.",
        names: [...names(cray), ...names(fish)].slice(0, 4),
      });
    }
  }
  const ghost = pick(inverts, (t) => t.ghostShrimp);
  if (
    ghost.length > 0 &&
    inverts.some(
      (l) => (T(l).neocaridina || T(l).caridina) && !ghost.includes(l),
    )
  ) {
    add({
      level: "warning",
      title: "Crevette fantôme avec de petites crevettes",
      detail:
        "La crevette fantôme est opportuniste : elle mange les jeunes des autres crevettes.",
      fix: "Garde-la seule ou avec des poissons paisibles.",
      names: names(ghost),
    });
  }

  // 5. Poissons qui mordillent les nageoires
  const nippers = pick(fish, (t) => t.nipper);
  const longfins = fish.filter((l) => T(l).longfin && !nippers.includes(l));
  if (nippers.length > 0 && longfins.length > 0) {
    const sensitive = longfins.some((l) => T(l).shy);
    add({
      level: sensitive ? "danger" : "warning",
      title: "Mordillage de nageoires",
      detail: `${names(nippers).join(", ")} ${nippers.length > 1 ? "mordillent" : "mordille"} les longues nageoires de ${names(longfins).join(", ")}.`,
      fix: "Sépare-les. Les nippers se calment en banc de 8 ou plus, mais restent risqués avec un Betta, un scalaire ou un discus.",
      names: [...names(nippers), ...names(longfins)],
    });
  }

  // 6. Territorialité
  for (const l of fish) {
    if (T(l).solitary && l.quantity > 1) {
      add({
        level: "danger",
        title: `Plusieurs ${l.name}`,
        detail: T(l).betta
          ? "Les mâles se battent jusqu’à la mort. Les femelles ensemble demandent un grand bac et beaucoup de cachettes."
          : "Cette espèce vit seule : les individus se battent entre eux.",
        fix: T(l).betta
          ? `Garde 1 seul ${l.name} (un mâle), ou un groupe de 5 femelles ou plus dans un bac très planté.`
          : `Garde 1 seul ${l.name}.`,
        names: [l.name],
      });
    }
  }
  const bettas = pick(fish, (t) => t.betta);
  if (bettas.length > 1 && bettas.every((b) => b.quantity === 1)) {
    add({
      level: "danger",
      title: "Deux espèces de Betta",
      detail: "Les Betta se reconnaissent entre eux et se battent.",
      fix: "Un seul Betta par bac.",
      names: names(bettas),
    });
  }
  if (bettas.length > 0) {
    const labyOthers = fish.filter(
      (l) => T(l).labyrinth && !bettas.includes(l),
    );
    if (labyOthers.length > 0) {
      add({
        level: "warning",
        title: "Betta avec un autre poisson à labyrinthe",
        detail:
          "Les gouramis et les Betta se disputent la surface et le territoire.",
        fix: "Garde un seul type de poisson à labyrinthe, ou prévois un grand bac très planté en surface.",
        names: [...names(bettas), ...names(labyOthers)],
      });
    }
  }
  const plecos = pick(fish, (t) => t.ancistrus);
  if (plecos.reduce((s, l) => s + l.quantity, 0) >= 2) {
    add({
      level: "warning",
      title: "Plusieurs Ancistrus",
      detail: "Les mâles se disputent les grottes et s’abîment les nageoires.",
      fix: "Un seul mâle, avec une ou deux femelles, et au moins une grotte par poisson.",
      names: names(plecos),
    });
  }
  const dwarfs = pick(fish, (t) => t.dwarfCichlid);
  if (dwarfs.length >= 2) {
    add({
      level: "warning",
      title: "Plusieurs cichlidés nains",
      detail:
        "Chaque mâle tient un territoire. Plusieurs espèces demandent un bac plus grand, avec racines et grottes qui coupent la vue.",
      fix: "Un seul harem (1 mâle + 2 à 3 femelles) dans un bac de 150 L.",
      names: names(dwarfs),
    });
  }
  // Espèces territoriales identifiées par l'IA (hors Betta, Ancistrus et cichlidés nains)
  const terr = fish.filter(
    (l) =>
      T(l).territorial && !T(l).betta && !T(l).ancistrus && !T(l).dwarfCichlid,
  );
  if (terr.length >= 2 || terr.some((l) => l.quantity >= 2)) {
    add({
      level: "warning",
      title: "Poissons territoriaux",
      detail: `${names(terr).join(", ")} défendent un territoire : les mâles se poursuivent et se blessent dans un bac de cette taille.`,
      fix: "Un seul mâle par espèce, des racines et des grottes qui coupent la vue.",
      names: names(terr),
    });
  }

  // 7. Poissons très actifs avec des poissons timides
  const active = pick(fish, (t) => t.active);
  const shy = fish.filter((l) => T(l).shy && !active.includes(l));
  if (active.length > 0 && shy.length > 0) {
    add({
      level: "warning",
      title: "Poissons très actifs avec des poissons calmes",
      detail: `${names(active).join(", ")} nagent vite et stressent ${names(shy).join(", ")}, qui se cachent et mangent mal.`,
      fix: "Préfère des poissons calmes de même rythme (Tétras, Rasbora, Corydoras).",
      names: [...names(active), ...names(shy)],
    });
  }

  // 8. Température
  const hot = pick(fish, (t) => t.hot);
  const cool = pick(fish, (t) => t.cool);
  if (hot.length > 0 && cool.length > 0) {
    add({
      level: "danger",
      title: "Températures opposées",
      detail: `${names(hot).join(", ")} demandent 28 à 30 °C, ${names(cool).join(", ")} préfèrent 18 à 24 °C.`,
      fix: "Choisis des espèces de la même plage de température, ou garde le discus avec des compagnons d’eau chaude (Tétras cardinalis, Rummy-nose, Apistogramma).",
      names: [...names(hot), ...names(cool)],
    });
  }

  // 9. Eau douce et acide contre eau dure et alcaline
  const soft = pick([...fish, ...inverts], (t) => t.soft);
  const hard = pick(fish, (t) => t.hard).filter((l) => !soft.includes(l));
  if (soft.length > 0 && hard.length > 0) {
    add({
      level: "warning",
      title: "Eau douce et acide contre eau dure",
      detail: `${names(soft).join(", ")} demandent une eau douce et acide (pH 6 à 7), ${names(hard).join(", ")} une eau dure et alcaline (pH 7,5 et plus).`,
      fix: "Choisis un camp. Ton eau du robinet décide : mesure le GH et le pH, puis garde les espèces qui correspondent.",
      names: [...names(soft), ...names(hard)],
    });
  }
  const caridina = pick(inverts, (t) => t.caridina);
  const neo = pick(inverts, (t) => t.neocaridina);
  if (caridina.length > 0 && neo.length > 0) {
    add({
      level: "warning",
      title: "Crevettes Caridina avec des Neocaridina",
      detail:
        "Les Caridina (Crystal, Taiwan Bee…) veulent une eau douce et acide, les Neocaridina une eau plus dure. L’un des deux groupes sera mal.",
      fix: "Sépare les deux, ou choisis uniquement des Neocaridina si ton eau est moyenne à dure.",
      names: [...names(caridina), ...names(neo)],
    });
  }
  const neoVariants = new Set(neo.map((l) => l.scientificName ?? l.name));
  if (neoVariants.size >= 2) {
    add({
      level: "info",
      title: "Plusieurs couleurs de Neocaridina",
      detail:
        "Les couleurs se croisent et les petits redeviennent bruns (couleur sauvage) au fil des générations.",
      fix: "Une seule couleur par bac pour garder une belle colonie.",
      names: names(neo),
    });
  }

  // 10. Escargots
  const snails = pick(inverts, (t) => t.snail);
  const planteEaters = snails.filter((l) => T(l).plantEatingSnail);
  if (planteEaters.length > 0) {
    add({
      level: "warning",
      title: "Escargots mangeurs de plantes",
      detail: `${names(planteEaters).join(", ")} ${planteEaters.length > 1 ? "broutent" : "broute"} les plantes tendres, ce qui compte dans un bac planté.`,
      fix: "Préfère des Neritina, des Physes ou des Tylomelania, qui laissent les plantes tranquilles.",
      names: names(planteEaters),
    });
  }
  const assassin = snails.filter((l) => T(l).assassinSnail);
  const otherSnails = snails.filter((l) => !assassin.includes(l));
  if (assassin.length > 0 && otherSnails.length > 0) {
    add({
      level: "warning",
      title: "Escargot Clea (assassin) avec d’autres escargots",
      detail:
        "Il mange les autres escargots, Neritina comprises à la longue. Il laisse les crevettes adultes tranquilles.",
      fix: "Garde-le seulement pour éliminer des Physes ou Planorbes en trop, pas dans un bac où tu tiens à tes escargots.",
      names: [...names(assassin), ...names(otherSnails)],
    });
  }
  const loaches = pick(fish, (t) => t.eatsSnails);
  if (loaches.length > 0 && snails.length > 0) {
    add({
      level: "warning",
      title: "Poissons qui mangent les escargots",
      detail: `${names(loaches).join(", ")} chassent les escargots, surtout les petits.`,
      fix: "Retire les escargots ou ces poissons.",
      names: [...names(loaches), ...names(snails)],
    });
  }

  const order: Record<CompatLevel, number> = { danger: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => order[a.level] - order[b.level]);
}
