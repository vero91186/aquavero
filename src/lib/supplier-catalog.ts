// Espèces proposées par le Comptoir du Poisson Exotique (grossiste réservé aux
// professionnels, poisson-exotique.fr), relevées le 5 octobre 2026 et filtrées
// pour un bac planté d'environ 150 L en eau moyennement dure (KH 6, GH 7-8).
// Chaque entrée est une espèce (les coloris d'élevage sont regroupés dans
// `varieties`) reliée au catalogue général par son nom scientifique, ce qui
// donne la photo, la taille adulte et les règles de banc.
// Les prix et stocks ne sont visibles que connecté : seules les ruptures du
// jour du relevé et le besoin d'eau plus douce sont indiqués, à titre indicatif.

export interface SupplierSpecies {
  name: string;
  // Nom scientifique, clé de liaison avec SPECIES_CATALOG et des photos.
  sci: string;
  // Coloris / variétés proposés, à titre d'information.
  varieties?: string;
  // Rupture de stock constatée à la date du relevé (toutes variétés).
  outOfStock?: boolean;
  // Préfère une eau plus douce que KH 6.
  softWater?: boolean;
  // Précaution d'association (ex. mange les jeunes crevettes).
  note?: string;
}

export interface SupplierGroup {
  id: string;
  label: string;
  note?: string;
  species: SupplierSpecies[];
}

export const SUPPLIER_NAME = "Comptoir du Poisson Exotique";
export const SUPPLIER_SNAPSHOT_DATE = "2026-10-05";

type Flags = Partial<Omit<SupplierSpecies, "name" | "sci">>;
const s = (name: string, sci: string, flags: Flags = {}): SupplierSpecies => ({ name, sci, ...flags });
const R = { outOfStock: true } as const;
const SW = { softWater: true } as const;

export const SUPPLIER_GROUPS: SupplierGroup[] = [
  {
    id: "tetras",
    label: "Tétras et characidés",
    species: [
      s("Néon bleu", "Paracheirodon innesi", { varieties: "classique, bleu diamant, bleu gold" }),
      s("Néon vert", "Paracheirodon simulans"),
      s("Néon rose", "Hyphessobrycon rosaceus", R),
      s("Néon noir", "Hyphessobrycon herbertaxelrodi"),
      s("Cardinalis", "Paracheirodon axelrodi", SW),
      s("Tétra citron", "Hyphessobrycon pulchripinnis"),
      s("Tétra amande", "Hyphessobrycon amandae"),
      s("Tétra gold", "Hemigrammus rodwayi"),
      s("Tétra cuivre", "Hasemania nana"),
      s("Tétra rosy", "Hyphessobrycon bentosi", { varieties: "rosy, bentosi white fin" }),
      s("Tétra de Rio", "Hyphessobrycon flammeus", { varieties: "rouge, orange" }),
      s("Tétra serpae", "Hyphessobrycon eques"),
      s("Tétra royal", "Inpaichthys kerri"),
      s("Tétra cœur saignant", "Hyphessobrycon erythrostigma"),
      s("Pristella", "Pristella maxillaris", { varieties: "classique, gold" }),
      s("Tétra pingouin", "Thayeria boehlkei", { varieties: "classique, red tail" }),
      s("Tétra nain elachys", "Hyphessobrycon elachys", SW),
      s("Axelrodia riesei", "Axelrodia riesei", SW),
      s("Tétra nez rouge", "Hemigrammus bleheri", { ...SW, varieties: "classique, albinos" }),
      s("Hemigrammus ocellifer", "Hemigrammus ocellifer"),
      s("Aphyocharax rathbuni", "Aphyocharax rathbuni"),
      s("Tétra bleu", "Mimagoniates microlepis"),
      s("Moenkhausia costae", "Moenkhausia costae"),
      s("Tétra verre à queue rouge", "Prionobrama filigera"),
      s("Tétra veuve noire", "Gymnocorymbus ternetzi", { varieties: "classique, albinos" }),
      s("Tétra fantôme noir", "Hyphessobrycon megalopterus", SW),
      s("Tétra fantôme rouge", "Hyphessobrycon sweglesi", SW),
      s("Tétra fantôme jaune", "Hyphessobrycon roseus", SW),
      s("Tétra empereur", "Nematobrycon palmeri", R),
      s("Tétra de Colombie", "Hyphessobrycon columbianus", R),
      s("Poisson crayon rouge", "Nannostomus beckfordi", SW),
    ],
  },
  {
    id: "rasboras",
    label: "Rasboras",
    species: [
      s("Rasbora arlequin", "Trigonostigma heteromorpha"),
      s("Rasbora espei", "Trigonostigma espei"),
      s("Rasbora axelrodi bleu", "Sundadanio axelrodi"),
      s("Rasbora argent", "Rasbora argyrotaenia"),
      s("Rasbora galaxy", "Danio margaritatus"),
      s("Rasbora émeraude", "Danio erythromicron"),
      s("Rasbora nain", "Boraras spp."),
      s("Rasbora naevus", "Boraras naevus"),
      s("Sawbwa resplendens", "Sawbwa resplendens"),
      s("Rasbora moustique", "Boraras brigittae", R),
      s("Rasbora hengeli", "Trigonostigma hengeli", R),
    ],
  },
  {
    id: "danios",
    label: "Danios et Tanichthys",
    species: [
      s("Danio rerio", "Danio rerio", { varieties: "normal, gold, gold voile (voile en rupture)" }),
      s("Danio léopard voile", "Danio rerio var. frankei"),
      s("Danio kyathit", "Danio kyathit"),
      s("Danio malabar", "Devario aequipinnatus"),
      s("Danio perlé", "Danio albolineatus", R),
      s("Tanichthys", "Tanichthys albonubes", { varieties: "classique, gold, voile" }),
    ],
  },
  {
    id: "barbus",
    label: "Barbus",
    note: "Le barbus sumatra mordille les nageoires : à éviter avec guppys et bettas.",
    species: [
      s("Barbus odessa rouge", "Pethia padamya"),
      s("Barbus cerise", "Puntius titteya", { varieties: "classique, albinos, voile" }),
      s("Barbus conchonius", "Pethia conchonius", { varieties: "classique, gold, rouge" }),
      s("Barbus pentazona", "Desmopuntius pentazona"),
      s("Barbus rubis noir", "Pethia nigrofasciata"),
      s("Barbus schuberti", "Barbodes semifasciolatus"),
    ],
  },
  {
    id: "arcs",
    label: "Arcs-en-ciel",
    species: [
      s("Arc-en-ciel nain", "Melanotaenia praecox"),
      s("Arc-en-ciel filigrane", "Iriatherina werneri"),
      s("Pseudomugil furcatus", "Pseudomugil furcatus"),
      s("Pseudomugil paskai", "Pseudomugil paskai"),
      s("Pseudomugil gertrudae", "Pseudomugil gertrudae"),
    ],
  },
  {
    id: "vivipares",
    label: "Guppys, platys, mollys et xiphos",
    species: [
      s("Guppy", "Poecilia reticulata", {
        varieties: "mâles et femelles classiques, select, premium (plusieurs coloris select en rupture)",
      }),
      s("Endler", "Poecilia wingei"),
      s("Platy", "Xiphophorus maculatus", {
        varieties: "une quarantaine : mickey, wagtail, sunset, panda, corail, voile (corail wagtail rouge et wagtail rouge shpitz en rupture)",
      }),
      s("Molly", "Poecilia sphenops", { varieties: "classique, lyre, ballon" }),
      s("Xipho", "Xiphophorus hellerii", { varieties: "classique, sélection" }),
    ],
  },
  {
    id: "bettas",
    label: "Bettas",
    note: "Le mâle est à réserver à un bac sans guppys ni endlers, qui le harcèlent.",
    species: [
      s("Betta", "Betta splendens", {
        varieties: "classique, crowntail, lyre, halfmoon, plakat, éléphant ; nombreux coloris mâles en rupture",
      }),
    ],
  },
  {
    id: "gouramis",
    label: "Gouramis",
    species: [
      s("Gourami perlé", "Trichopodus leerii"),
      s("Gourami grogneur nain", "Trichopsis pumila"),
      s("Gourami nain", "Trichogaster lalius", { varieties: "cobalt, rouge, néon bleu" }),
      s("Chuna", "Trichogaster chuna", { varieties: "miel, gold, rouge, red tail" }),
      s("Chuna labiosa orange", "Trichogaster labiosa"),
    ],
  },
  {
    id: "cichlides",
    label: "Cichlidés nains",
    note: "Tous s'attaquent aux jeunes crevettes. Le pelmato pulcher est le plus facile avec une eau à KH 6.",
    species: [
      s("Pelmato pulcher", "Pelvicachromis pulcher", { varieties: "classique, albinos" }),
      s("Apistogramma agassizii", "Apistogramma agassizii", { varieties: "double rouge" }),
      s("Apistogramma cacatuoides", "Apistogramma cacatuoides", { varieties: "double rouge" }),
      s("Apistogramma macmasteri", "Apistogramma macmasteri"),
      s("Apistogramma borellii", "Apistogramma borellii"),
      s("Apistogramma nijsseni", "Apistogramma nijsseni", SW),
      s("Apistogramma viejita", "Apistogramma viejita", SW),
      s("Apistogramma hongsloi", "Apistogramma hongsloi", { varieties: "gold red" }),
      s("Ramirezi", "Mikrogeophagus ramirezi", { varieties: "classique, black velvet, electric bleu, gold" }),
      s("Laetacara curviceps", "Laetacara curviceps"),
      s("Aequidens maronii", "Cleithracara maronii"),
      s("Cichlidé damier nain", "Dicrossus filamentosus", SW),
    ],
  },
  {
    id: "killies",
    label: "Killies et assimilés",
    species: [
      s("Tateurndina ocellicauda", "Tateurndina ocellicauda"),
      s("Néon yeux bleus", "Pseudomugil luminatus"),
      s("Killi clown", "Pseudepiplatys annulatus", SW),
      s("Epiplatys dagetti", "Epiplatys dagetti"),
      s("Aphyosemion gardneri", "Fundulopanchax gardneri"),
      s("Aphyosemion cap lopez gold", "Aphyosemion australe"),
      s("Aphyosemion striatum", "Aphyosemion striatum", R),
      s("Medaka", "Oryzias latipes", { varieties: "platinum white, orange strass, black" }),
      s("Oryzias woworae", "Oryzias woworae"),
    ],
  },
  {
    id: "corydoras",
    label: "Corydoras",
    species: [
      s("Corydoras sterbai", "Corydoras sterbai"),
      s("Corydoras julii", "Corydoras trilineatus"),
      s("Corydoras panda", "Corydoras panda"),
      s("Corydoras adolfoi", "Corydoras adolfoi"),
      s("Corydoras concolor", "Corydoras concolor"),
      s("Corydoras loxozonum", "Corydoras loxozonum"),
      s("Corydoras melini", "Corydoras melini"),
      s("Corydoras bandit", "Corydoras metae"),
      s("Corydoras Olga", "Corydoras sp. Olga"),
      s("Corydoras eques", "Corydoras eques"),
      s("Corydoras duplicareus", "Corydoras duplicareus"),
      s("Corydoras poivre", "Corydoras paleatus", { varieties: "classique, albinos" }),
      s("Corydoras bronze", "Corydoras aeneus", { varieties: "classique, albinos, black et orange Venezuela, gold laser" }),
      s("Corydoras barbatus", "Scleromystax barbatus"),
      s("Corydoras pygmaeus", "Corydoras pygmaeus", { varieties: "classique, albinos, élevage" }),
      s("Brochis", "Brochis splendens", { ...R, varieties: "agassizii, splendens" }),
      s("Gastrodermus hastatus", "Corydoras hastatus", R),
    ],
  },
  {
    id: "fond",
    label: "Ancistrus, kuhlis, Otocinclus et loricaridés",
    species: [
      s("Ancistrus", "Ancistrus sp.", {
        varieties: "classique, gold, voile, gold voile, super red, lemon blue eyes (red LDA16 en rupture)",
      }),
      s("Kuhli", "Pangio kuhlii", { varieties: "loche rayée, noir, argenté" }),
      s("Otocinclus", "Otocinclus affinis"),
      s("Botia nain", "Botia sidthimunki"),
      s("Botia kubotai", "Botia kubotai"),
      s("Farlowella acus", "Farlowella acus"),
      s("Peckoltia vittata", "Peckoltia vittata"),
      s("Peckoltia compta", "Peckoltia compta"),
      s("Panaqolus L397", "Panaqolus sp. L397"),
      s("Hypancistrus L66", "Hypancistrus sp. L66"),
      s("Hypancistrus L129", "Hypancistrus sp. L129"),
      s("Hypancistrus L333", "Hypancistrus sp. L333"),
      s("Dekeyseria L052", "Dekeyseria sp. L052"),
      s("Dekeyseria L501", "Dekeyseria sp. L501"),
    ],
  },
  {
    id: "crevettes",
    label: "Crevettes",
    note: "Les Caridina (red crystal, red mosura bee) préfèrent un KH de 0 à 2 : déconseillées à KH 6. Les crevettes bambou et bleues du Gabon demandent un fort courant.",
    species: [
      s("Crevette amano", "Caridina multidentata"),
      s("Neocaridina red cherry", "Neocaridina davidi"),
      s("Neocaridina orange fire / sakura", "Neocaridina davidi var. orange"),
      s("Neocaridina yellow fire", "Neocaridina davidi var. yellow"),
      s("Neocaridina black cherry", "Neocaridina davidi var. black"),
      s("Neocaridina bloody mary", "Neocaridina davidi var. Bloody Mary"),
      s("Neocaridina red fire / yellow cherry / sunkist", "Neocaridina davidi", R),
      s("Neocaridina bleu diamant", "Neocaridina davidi var. blue", R),
    ],
  },
  {
    id: "escargots",
    label: "Escargots",
    note: "Ils ne prolifèrent pas en eau douce.",
    species: [
      s("Néritine", "Neritina natalensis", { varieties: "rayé, tigré, red spotted, tatoué, red lips" }),
      s("Néritine vittina batik", "Vittina semiconica"),
      s("Néritine pulligera", "Neripteron pulligerum", R),
      s("Clithon corona", "Clithon corona", { varieties: "rayé, noir, couronne verte, sunsnail" }),
    ],
  },
];

export const SUPPLIER_TO_AVOID: { label: string; reason: string }[] = [
  { label: "Scalaires", reason: "50 cm de haut est limite pour des adultes, et ils mangent néons et jeunes crevettes." },
  { label: "Cichlidés du Malawi et du Tanganyika", reason: "ils veulent une eau dure et alcaline et un décor de roches." },
  { label: "Grands cichlidés américains", reason: "oscars, Jack Dempsey, convict, parrot, acaras : trop grands et agressifs." },
  { label: "Discus", reason: "28 à 30 °C, eau très douce, 200 L ou plus." },
  { label: "Poissons trop grands ou agressifs", reason: "veliferas, Botia clown, piranhas, barbus denisonii, Pimelodus pictus, escargot assassin, écrevisses naines." },
];

export type SupplierStatus = "available" | "out";

const normName = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Statut d'une espèce chez le grossiste, d'après le dernier relevé : null si
// l'espèce n'y figure pas. Rapprochement par nom scientifique, sinon par nom
// commun ; « disponible » dès qu'une entrée de la même espèce n'est pas en rupture.
export function supplierStatusOf(
  commonName: string,
  scientificName?: string | null,
): SupplierStatus | null {
  const sci = scientificName ? normName(scientificName) : null;
  const common = normName(commonName);
  let found: SupplierStatus | null = null;
  for (const g of SUPPLIER_GROUPS) {
    for (const sp of g.species) {
      if ((sci && normName(sp.sci) === sci) || normName(sp.name) === common) {
        if (!sp.outOfStock) return "available";
        found = "out";
      }
    }
  }
  return found;
}
