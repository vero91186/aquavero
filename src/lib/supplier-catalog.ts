// Espèces proposées par le Comptoir du Poisson Exotique (grossiste réservé aux
// professionnels, poisson-exotique.fr), relevées le 5 octobre 2026 et filtrées
// pour un bac planté d'environ 150 L en eau moyennement dure (KH 6, GH 7-8).
// Les prix et stocks ne sont visibles que connecté : seuls les ruptures du jour
// et le besoin d'eau plus douce sont indiqués, à titre indicatif.

export interface SupplierSpecies {
  name: string;
  // Rupture de stock constatée à la date du relevé.
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

const s = (name: string, flags: Omit<SupplierSpecies, "name"> = {}): SupplierSpecies => ({ name, ...flags });
const R = { outOfStock: true } as const;
const SW = { softWater: true } as const;

export const SUPPLIER_GROUPS: SupplierGroup[] = [
  {
    id: "tetras",
    label: "Tétras et characidés",
    species: [
      s("Néon bleu"), s("Néon bleu diamant"), s("Néon bleu gold"), s("Néon vert"), s("Néon rose", R),
      s("Néon noir"), s("Cardinalis", SW), s("Tétra citron"), s("Tétra amande"), s("Tétra gold"),
      s("Tétra cuivre"), s("Tétra rosy"), s("Tétra bentosi white fin"), s("Tétra de Rio rouge"),
      s("Tétra de Rio orange"), s("Tétra serpae"), s("Tétra royal"), s("Tétra cœur saignant"),
      s("Pristella"), s("Pristella gold"), s("Tétra pingouin"), s("Tétra pingouin red tail"),
      s("Tétra nain elachys", SW), s("Axelrodia riesei", SW), s("Tétra nez rouge", SW),
      s("Tétra nez rouge albinos", SW), s("Hemigrammus ocellifer"), s("Aphyocharax rathbuni"),
      s("Tétra bleu"), s("Moenkhausia costae"), s("Tétra verre à queue rouge"),
      s("Tétra veuve noire"), s("Tétra veuve noire albinos"), s("Tétra fantôme noir", SW),
      s("Tétra fantôme jaune", SW), s("Tétra fantôme rouge", SW), s("Tétra empereur", R),
      s("Tétra de Colombie", R), s("Poisson crayon rouge", SW),
    ],
  },
  {
    id: "rasboras",
    label: "Rasboras",
    species: [
      s("Rasbora arlequin"), s("Rasbora espei"), s("Rasbora axelrodi bleu"), s("Rasbora argent"),
      s("Rasbora galaxy"), s("Rasbora émeraude"), s("Rasbora nain (Boraras)"), s("Rasbora naevus"),
      s("Sawbwa resplendens"), s("Rasbora moustique", R), s("Rasbora hengeli", R),
    ],
  },
  {
    id: "danios",
    label: "Danios et Tanichthys",
    species: [
      s("Danio rerio normal"), s("Danio rerio gold"), s("Danio rerio voile", R), s("Danio rerio gold voile"),
      s("Danio léopard voile"), s("Danio kyathit"), s("Danio malabar"), s("Danio perlé", R),
      s("Tanichthys classique"), s("Tanichthys gold"), s("Tanichthys voile"),
    ],
  },
  {
    id: "barbus",
    label: "Barbus",
    note: "Le barbus sumatra mordille les nageoires : à éviter avec guppys et bettas.",
    species: [
      s("Barbus odessa rouge"), s("Barbus cerise"), s("Barbus cerise albinos"), s("Barbus cerise voile"),
      s("Barbus conchonius"), s("Barbus conchonius gold"), s("Barbus conchonius rouge"),
      s("Barbus pentazona"), s("Barbus rubis noir"), s("Barbus schuberti"),
    ],
  },
  {
    id: "arcs",
    label: "Arcs-en-ciel",
    species: [
      s("Arc-en-ciel nain (praecox)"), s("Arc-en-ciel filigrane (Iriatherina)"),
      s("Pseudomugil furcatus"), s("Pseudomugil paskai"), s("Pseudomugil gertrudae"),
    ],
  },
  {
    id: "vivipares",
    label: "Guppys, platys, mollys et xiphos",
    species: [
      s("Guppy classique"), s("Guppy select"), s("Guppy premium"), s("Endler"),
      s("Guppy mâle blond léopard", R), s("Guppy mâle cobra bleu", R),
      s("Guppy mâle select éléphant platinum", R), s("Guppy mâle select éléphant gold platinum", R),
      s("Guppy femelle select red king cobra", R),
      s("Platy mickey"), s("Platy wagtail"), s("Platy sunset"), s("Platy panda"), s("Platy corail"),
      s("Platy voile"), s("Platy corail wagtail rouge", R), s("Platy wagtail rouge shpitz", R),
      s("Molly classique"), s("Molly lyre"), s("Molly ballon"),
      s("Xipho classique"), s("Xipho sélection"),
    ],
  },
  {
    id: "bettas",
    label: "Bettas",
    note: "Le mâle est à réserver à un bac sans guppys ni endlers, qui le harcèlent.",
    species: [
      s("Betta classique"), s("Betta crowntail"), s("Betta lyre"), s("Betta halfmoon"),
      s("Betta plakat"), s("Betta éléphant"),
      s("Betta mâle classique bleu", R), s("Betta mâle classique jaune", R), s("Betta mâle classique rouge", R),
      s("Betta mâle classique vert", R), s("Betta mâle classique cambodian", R),
      s("Betta halfmoon select bicolore", R), s("Betta halfmoon select mustard", R),
      s("Betta plakat select koi", R), s("Betta plakat select galaxy", R),
      s("Betta plakat select yellow fancy", R), s("Betta plakat select barongsai", R),
    ],
  },
  {
    id: "gouramis",
    label: "Gouramis",
    species: [
      s("Gourami perlé"), s("Gourami grogneur nain"), s("Trichogaster lalius cobalt"),
      s("Trichogaster lalius rouge"), s("Trichogaster lalius néon bleu"),
      s("Chuna miel"), s("Chuna gold"), s("Chuna rouge"), s("Chuna red tail"), s("Chuna labiosa orange"),
    ],
  },
  {
    id: "cichlides",
    label: "Cichlidés nains",
    note: "Tous s'attaquent aux jeunes crevettes. Le pelmato pulcher est le plus facile avec une eau à KH 6.",
    species: [
      s("Pelvicachromis pulcher"), s("Pelvicachromis pulcher albinos"),
      s("Apistogramma agassizii double rouge"), s("Apistogramma cacatuoides double rouge"),
      s("Apistogramma macmasteri"), s("Apistogramma borellii"), s("Apistogramma nijsseni", SW),
      s("Apistogramma viejita", SW), s("Apistogramma hongsloi gold red"),
      s("Ramirezi classique"), s("Ramirezi black velvet"), s("Ramirezi electric bleu"), s("Ramirezi gold"),
      s("Laetacara curviceps"), s("Aequidens maronii"), s("Cichlidé damier nain", SW),
    ],
  },
  {
    id: "killies",
    label: "Killies et assimilés",
    species: [
      s("Tateurndina ocellicauda"), s("Néon yeux bleus"), s("Killi clown", SW), s("Epiplatys dagetti"),
      s("Aphyosemion gardneri"), s("Aphyosemion cap lopez gold"), s("Aphyosemion striatum", R),
      s("Medaka platinum white"), s("Medaka orange strass"), s("Medaka black"), s("Oryzias woworae"),
    ],
  },
  {
    id: "corydoras",
    label: "Corydoras",
    species: [
      s("Corydoras sterbai"), s("Corydoras julii"), s("Corydoras panda"), s("Corydoras adolfoi"),
      s("Corydoras concolor"), s("Corydoras loxozonum"), s("Corydoras melini"), s("Corydoras bandit"),
      s("Corydoras Olga"), s("Corydoras eques"), s("Corydoras duplicareus"), s("Corydoras poivre"),
      s("Corydoras poivre albinos"), s("Corydoras bronze"), s("Corydoras bronze albinos"),
      s("Corydoras black Venezuela"), s("Corydoras orange Venezuela"), s("Corydoras gold laser"),
      s("Corydoras barbatus"), s("Corydoras pygmaeus"), s("Corydoras pygmaeus albinos"),
      s("Brochis agassizii", R), s("Brochis splendens", R), s("Gastrodermus hastatus", R),
    ],
  },
  {
    id: "fond",
    label: "Ancistrus, kuhlis, Otocinclus et loricaridés",
    species: [
      s("Ancistrus classique"), s("Ancistrus gold"), s("Ancistrus voile"), s("Ancistrus gold voile"),
      s("Ancistrus super red"), s("Ancistrus lemon blue eyes"), s("Ancistrus red (LDA16)", R),
      s("Kuhli loche rayée"), s("Kuhli noir"), s("Kuhli argenté"), s("Otocinclus affinis"),
      s("Botia nain"), s("Botia kubotai"), s("Farlowella acus"),
      s("Peckoltia vittata"), s("Peckoltia compta"), s("Panaqolus L397"), s("Hypancistrus L66"),
      s("Hypancistrus L129"), s("Hypancistrus L333"), s("Dekeyseria L052"), s("Dekeyseria L501"),
    ],
  },
  {
    id: "crevettes",
    label: "Crevettes",
    note: "Les Caridina (red crystal, red mosura bee) préfèrent un KH de 0 à 2 : déconseillées à KH 6. Les crevettes bambou et bleues du Gabon demandent un fort courant.",
    species: [
      s("Crevette amano"), s("Neocaridina red cherry"), s("Neocaridina orange fire"), s("Neocaridina sakura"),
      s("Neocaridina yellow fire"), s("Neocaridina black cherry"), s("Neocaridina bloody mary"),
      s("Neocaridina red fire", R), s("Neocaridina yellow cherry", R), s("Neocaridina sunkist", R),
      s("Neocaridina bleu diamant", R),
    ],
  },
  {
    id: "escargots",
    label: "Escargots",
    note: "Ils ne prolifèrent pas en eau douce.",
    species: [
      s("Néritine rayée"), s("Néritine tigrée"), s("Néritine red spotted"), s("Néritine tatouée"),
      s("Néritine red lips"), s("Néritine vittina batik"), s("Néritine pulligera", R),
      s("Clithon corona rayé"), s("Clithon corona noir"), s("Clithon couronne verte"), s("Clithon sunsnail"),
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
