import type { LivestockCategory, SwimZone } from '@/types/database';

// Catalogue indicatif d'espèces courantes, pour préremplir l'ajout au
// peuplement (facteur de charge biologique, taille adulte, tempérament,
// volume minimal recommandé, zone de nage, caractère solitaire). Reste
// entièrement optionnel : n'importe quelle espèce hors catalogue peut être
// saisie librement à la main.
//
// bioload_factor : échelle indicative où 1.0 = petit poisson paisible type
// néon (~4 cm). Les valeurs montent avec le volume de déchets produit
// (taille, métabolisme, régime), pas seulement la taille physique.

export interface SpeciesReference {
  commonName: string;
  scientificName: string;
  category: LivestockCategory;
  bioloadFactor: number;
  adultSizeCm: number;
  temperament: string;
  minTankLiters: number;
  swimZone: SwimZone;
  solitary: boolean;
  sexNote?: string;
}

export const SPECIES_CATALOG: SpeciesReference[] = [
  // --- Poissons d'eau douce : petits paisibles ---
  { commonName: 'Néon bleu', scientificName: 'Paracheirodon innesi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Néon cardinalis', scientificName: 'Paracheirodon axelrodi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Guppy', scientificName: 'Poecilia reticulata', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false, sexNote: 'vivipare — 1 mâle pour 2-3 femelles pour éviter le harcèlement' },
  { commonName: 'Platy', scientificName: 'Xiphophorus maculatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false, sexNote: 'vivipare — 1 mâle pour 2-3 femelles' },
  { commonName: 'Molly', scientificName: 'Poecilia sphenops', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false, sexNote: 'vivipare — 1 mâle pour 2-3 femelles' },
  { commonName: 'Danio zébré', scientificName: 'Danio rerio', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, très actif', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Rasbora Harlequin', scientificName: 'Trigonostigma heteromorpha', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Boraras', scientificName: 'Boraras spp.', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson-hachette argenté', scientificName: 'Gasteropelecus sternicla', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, surface', minTankLiters: 80, swimZone: 'top', solitary: false },

  // --- Poissons de fond / algivores ---
  { commonName: 'Corydoras sterbai', scientificName: 'Corydoras sterbai', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras pygmée', scientificName: 'Corydoras pygmaeus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3, temperament: 'paisible, grégaire, fond', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Ancistrus (bristlenose)', scientificName: 'Ancistrus sp.', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Otocinclus', scientificName: 'Otocinclus sp.', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche kuhli', scientificName: 'Pangio kuhlii', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 10, temperament: 'paisible, grégaire, fouisseur', minTankLiters: 80, swimZone: 'bottom', solitary: false },

  // --- Cichlidés et poissons plus imposants ---
  { commonName: 'Ram bolivien', scientificName: 'Mikrogeophagus altispinosus', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 8, temperament: 'globalement paisible, territorial en reproduction', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Scalaire', scientificName: 'Pterophyllum scalare', category: 'fish', bioloadFactor: 3.5, adultSizeCm: 15, temperament: 'semi-agressif, territorial', minTankLiters: 150, swimZone: 'mid', solitary: false },
  { commonName: 'Gourami perlé', scientificName: 'Trichopodus leerii', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 12, temperament: 'globalement paisible', minTankLiters: 120, swimZone: 'top', solitary: false },
  { commonName: 'Betta', scientificName: 'Betta splendens', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'territorial, mâles incompatibles entre eux', minTankLiters: 40, swimZone: 'top', solitary: true, sexNote: 'jamais deux mâles ensemble' },

  // --- Invertébrés d'eau douce ---
  { commonName: 'Crevette Red Cherry', scientificName: 'Neocaridina davidi', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Amano', scientificName: 'Caridina multidentata', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 4, temperament: 'paisible, algivore', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina', scientificName: 'Neritina natalensis', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2.5, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Planorbe', scientificName: 'Planorbidae', category: 'invertebrate', bioloadFactor: 0.1, adultSizeCm: 1.5, temperament: 'paisible, se reproduit vite', minTankLiters: 10, swimZone: 'bottom', solitary: false },
  { commonName: 'Physe', scientificName: 'Physidae', category: 'invertebrate', bioloadFactor: 0.1, adultSizeCm: 1.5, temperament: 'paisible, se reproduit très vite', minTankLiters: 10, swimZone: 'bottom', solitary: false },

  // --- Plantes courantes ---
  { commonName: 'Vallisneria', scientificName: 'Vallisneria sp.', category: 'plant', bioloadFactor: 0, adultSizeCm: 40, temperament: 'plante de fond, pousse rapide', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Cryptocoryne wendtii', scientificName: 'Cryptocoryne wendtii', category: 'plant', bioloadFactor: 0, adultSizeCm: 20, temperament: 'plante de premier plan/milieu, peu exigeante', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Anubias nana', scientificName: 'Anubias barteri var. nana', category: 'plant', bioloadFactor: 0, adultSizeCm: 10, temperament: 'à fixer sur bois/roche, très peu exigeante', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Mousse de Java', scientificName: 'Taxiphyllum barbieri', category: 'plant', bioloadFactor: 0, adultSizeCm: 5, temperament: 'à fixer, très peu exigeante', minTankLiters: 10, swimZone: 'bottom', solitary: false },
  { commonName: 'Mousse flamme', scientificName: "Taxiphyllum sp. 'Flame'", category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'à fixer sur bois/roche, port dressé en flammes, très peu exigeante', minTankLiters: 10, swimZone: 'bottom', solitary: false },
  { commonName: 'Fougère de Java', scientificName: 'Microsorum pteropus', category: 'plant', bioloadFactor: 0, adultSizeCm: 15, temperament: 'à fixer sur bois/roche', minTankLiters: 20, swimZone: 'bottom', solitary: false },

  // --- Marin / récifal courant ---
  { commonName: 'Poisson-clown Ocellaris', scientificName: 'Amphiprion ocellaris', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 8, temperament: 'territorial en couple', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Chirurgien bleu (Hepatus)', scientificName: 'Paracanthurus hepatus', category: 'fish', bioloadFactor: 4.0, adultSizeCm: 25, temperament: 'territorial, besoin de nage', minTankLiters: 400, swimZone: 'mid', solitary: false },
  { commonName: 'Demoiselle bleue', scientificName: 'Chrysiptera cyanea', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 7, temperament: 'territorial, agressif entre congénères', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Crevette nettoyeuse', scientificName: 'Lysmata amboinensis', category: 'invertebrate', bioloadFactor: 0.4, adultSizeCm: 5, temperament: 'paisible, nettoyeuse', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Corail champignon', scientificName: 'Discosoma sp.', category: 'coral', bioloadFactor: 0.1, adultSizeCm: 5, temperament: 'peu exigeant, lumière modérée', minTankLiters: 60, swimZone: 'bottom', solitary: false },

  // --- Compléments : poissons et invertébrés courants ---
  { commonName: 'Tétra citron', scientificName: 'Hyphessobrycon pulchripinnis', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra à tête rouge', scientificName: 'Hemigrammus bleheri', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora brillant (Rummy-nose)', scientificName: 'Hemigrammus rhodostomus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire, sensible à la qualité d\'eau', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra noir (Black Neon)', scientificName: 'Hyphessobrycon herbertaxelrodi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra Rosy', scientificName: 'Hyphessobrycon bentosi', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra empereur', scientificName: 'Nematobrycon palmeri', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra de Rio', scientificName: 'Hyphessobrycon flammeus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra du Congo', scientificName: 'Phenacogrammus interruptus', category: 'fish', bioloadFactor: 1.8, adultSizeCm: 9, temperament: 'paisible, grégaire, actif', minTankLiters: 200, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra ember', scientificName: 'Hyphessobrycon amandae', category: 'fish', bioloadFactor: 0.7, adultSizeCm: 2.5, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra aux yeux rouges', scientificName: 'Moenkhausia sanctaefilomenae', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, actif', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra pingouin', scientificName: 'Thayeria boehlkei', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Pristella', scientificName: 'Pristella maxillaris', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus cerise', scientificName: 'Puntius titteya', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, timide', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus de Sumatra', scientificName: 'Puntigrus tetrazona', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'actif, mordille les nageoires', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus à cinq bandes', scientificName: 'Desmopuntius pentazona', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Danio paillete (Celestial Pearl)', scientificName: 'Danio margaritatus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 2.5, temperament: 'paisible, grégaire, timide', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Danio léopard', scientificName: 'Danio rerio var. frankei', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, très actif', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Rasbora espei', scientificName: 'Trigonostigma espei', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 3.5, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora galaxy', scientificName: 'Microdevario kubotai', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 2.5, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Endler', scientificName: 'Poecilia wingei', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 3.5, temperament: 'paisible, très actif', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Corydoras panda', scientificName: 'Corydoras panda', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire, fond', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras aeneus (bronze)', scientificName: 'Corydoras aeneus', category: 'fish', bioloadFactor: 1.4, adultSizeCm: 7, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras habrosus', scientificName: 'Corydoras habrosus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3, temperament: 'paisible, grégaire, fond', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras duplicareus', scientificName: 'Corydoras duplicareus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire, fond', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche botia pygmée', scientificName: 'Botia sidthimunki', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'actif, grégaire', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche Botia skunk', scientificName: 'Yasuhikotakia morleti', category: 'fish', bioloadFactor: 1.8, adultSizeCm: 10, temperament: 'semi-agressif, grégaire', minTankLiters: 150, swimZone: 'bottom', solitary: false },
  { commonName: 'Mangeur d\'algues siamois', scientificName: 'Crossocheilus oblongus', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 12, temperament: 'paisible, algivore, grégaire', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Pléco zèbre', scientificName: 'Hypancistrus zebra', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 8, temperament: 'paisible, cavernicole', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Pléco bristlenose albinos', scientificName: 'Ancistrus cirrhosus', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Apistogramma cacatuoides', scientificName: 'Apistogramma cacatuoides', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'territorial en reproduction, harem', minTankLiters: 80, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Apistogramma agassizii', scientificName: 'Apistogramma agassizii', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Apistogramma borellii', scientificName: 'Apistogramma borellii', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'territorial en reproduction', minTankLiters: 60, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Ram papillon', scientificName: 'Mikrogeophagus ramirezi', category: 'fish', bioloadFactor: 1.7, adultSizeCm: 6, temperament: 'globalement paisible, sensible', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Discus', scientificName: 'Symphysodon aequifasciatus', category: 'fish', bioloadFactor: 5.0, adultSizeCm: 18, temperament: 'paisible mais exigeant (eau chaude, très propre)', minTankLiters: 300, swimZone: 'mid', solitary: false },
  { commonName: 'Gourami nain', scientificName: 'Trichogaster lalius', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, timide', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Gourami miel', scientificName: 'Trichogaster chuna', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4.5, temperament: 'paisible, timide', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Gourami bleu', scientificName: 'Trichopodus trichopterus', category: 'fish', bioloadFactor: 3.0, adultSizeCm: 12, temperament: 'territorial, parfois agressif', minTankLiters: 150, swimZone: 'top', solitary: false },
  { commonName: 'Poisson arc-en-ciel Boesemani', scientificName: 'Melanotaenia boesemani', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 10, temperament: 'paisible, très actif, grégaire', minTankLiters: 200, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson-papillon d\'eau douce', scientificName: 'Pantodon buchholzi', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 12, temperament: 'prédateur de surface, bac couvert', minTankLiters: 150, swimZone: 'top', solitary: false },
  { commonName: 'Nannostomus (poisson-crayon)', scientificName: 'Nannostomus beckfordi', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 6, temperament: 'paisible, grégaire, timide', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Hatchet marbré', scientificName: 'Carnegiella strigata', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire, surface, bac couvert', minTankLiters: 80, swimZone: 'top', solitary: false },
  { commonName: 'Poisson-chat de verre', scientificName: 'Kryptopterus vitreolus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible, grégaire, timide', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora arlequin Hengeli', scientificName: 'Trigonostigma hengeli', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 3.5, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Platy variatus', scientificName: 'Xiphophorus variatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false, sexNote: 'vivipare — 1 mâle pour 2-3 femelles' },
  { commonName: 'Porte-épée', scientificName: 'Xiphophorus hellerii', category: 'fish', bioloadFactor: 1.8, adultSizeCm: 10, temperament: 'paisible à semi-agressif entre mâles', minTankLiters: 100, swimZone: 'mid', solitary: false, sexNote: 'vivipare — 1 mâle pour 3 femelles' },
  { commonName: 'Medaka (ricefish)', scientificName: 'Oryzias latipes', category: 'fish', bioloadFactor: 0.7, adultSizeCm: 3.5, temperament: 'paisible, eau fraîche', minTankLiters: 40, swimZone: 'top', solitary: false },
  { commonName: 'Crevette Cristal Red', scientificName: 'Caridina cantonensis', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2.5, temperament: 'paisible, exigeante sur l\'eau', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Blue Dream', scientificName: 'Neocaridina davidi var. blue', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Yellow', scientificName: 'Neocaridina davidi var. yellow', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette bambou', scientificName: 'Atyopsis moluccensis', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 8, temperament: 'paisible, filtre le courant', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Tylomelania', scientificName: 'Tylomelania sp.', category: 'invertebrate', bioloadFactor: 0.4, adultSizeCm: 6, temperament: 'paisible, vivipare', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Clea (assassin)', scientificName: 'Anentome helena', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 2, temperament: 'mange les autres escargots', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot trompette', scientificName: 'Melanoides tuberculata', category: 'invertebrate', bioloadFactor: 0.1, adultSizeCm: 3, temperament: 'paisible, fouisseur, prolifère', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Écrevisse naine (CPO)', scientificName: 'Cambarellus patzcuarensis', category: 'invertebrate', bioloadFactor: 0.5, adultSizeCm: 4, temperament: 'prédateur opportuniste des crevettes', minTankLiters: 40, swimZone: 'bottom', solitary: false },

  // --- Compléments : plantes ---
  { commonName: 'Echinodorus Ozelot', scientificName: 'Echinodorus \'Ozelot\'', category: 'plant', bioloadFactor: 0, adultSizeCm: 35, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Echinodorus bleheri', scientificName: 'Echinodorus bleheri', category: 'plant', bioloadFactor: 0, adultSizeCm: 40, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Sagittaire naine', scientificName: 'Sagittaria subulata', category: 'plant', bioloadFactor: 0, adultSizeCm: 20, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cryptocoryne parva', scientificName: 'Cryptocoryne parva', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cryptocoryne balansae', scientificName: 'Cryptocoryne balansae', category: 'plant', bioloadFactor: 0, adultSizeCm: 35, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Bucephalandra', scientificName: 'Bucephalandra sp.', category: 'plant', bioloadFactor: 0, adultSizeCm: 10, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Anubias barteri', scientificName: 'Anubias barteri var. barteri', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Anubias petite', scientificName: 'Anubias barteri var. nana \'Petite\'', category: 'plant', bioloadFactor: 0, adultSizeCm: 6, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Rotala rotundifolia', scientificName: 'Rotala rotundifolia', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Rotala macrandra', scientificName: 'Rotala macrandra', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Ludwigia repens', scientificName: 'Ludwigia repens', category: 'plant', bioloadFactor: 0, adultSizeCm: 35, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Bacopa caroliniana', scientificName: 'Bacopa caroliniana', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Hygrophila polysperma', scientificName: 'Hygrophila polysperma', category: 'plant', bioloadFactor: 0, adultSizeCm: 40, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cabomba', scientificName: 'Cabomba caroliniana', category: 'plant', bioloadFactor: 0, adultSizeCm: 50, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Limnophila sessiliflora', scientificName: 'Limnophila sessiliflora', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Élodée', scientificName: 'Egeria densa', category: 'plant', bioloadFactor: 0, adultSizeCm: 50, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cératophylle', scientificName: 'Ceratophyllum demersum', category: 'plant', bioloadFactor: 0, adultSizeCm: 50, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Hydrocotyle', scientificName: 'Hydrocotyle leucocephala', category: 'plant', bioloadFactor: 0, adultSizeCm: 15, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Glossostigma', scientificName: 'Glossostigma elatinoides', category: 'plant', bioloadFactor: 0, adultSizeCm: 3, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Eleocharis (scirpe nain)', scientificName: 'Eleocharis parvula', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Lilaeopsis', scientificName: 'Lilaeopsis brasiliensis', category: 'plant', bioloadFactor: 0, adultSizeCm: 6, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cuba (Hemianthus)', scientificName: 'Hemianthus callitrichoides', category: 'plant', bioloadFactor: 0, adultSizeCm: 4, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Mousse de Noël', scientificName: 'Vesicularia montagnei', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Marimo', scientificName: 'Aegagropila linnaei', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Lentille d\'eau', scientificName: 'Lemna minor', category: 'plant', bioloadFactor: 0, adultSizeCm: 1, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Salade d\'eau', scientificName: 'Pistia stratiotes', category: 'plant', bioloadFactor: 0, adultSizeCm: 15, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Limnobium (grenouillette)', scientificName: 'Limnobium laevigatum', category: 'plant', bioloadFactor: 0, adultSizeCm: 5, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Cryptocoryne undulata', scientificName: 'Cryptocoryne undulata', category: 'plant', bioloadFactor: 0, adultSizeCm: 25, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Pogostemon helferi', scientificName: 'Pogostemon helferi', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Pogostemon stellatus', scientificName: 'Pogostemon stellatus', category: 'plant', bioloadFactor: 0, adultSizeCm: 30, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Staurogyne repens', scientificName: 'Staurogyne repens', category: 'plant', bioloadFactor: 0, adultSizeCm: 8, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Micranthemum umbrosum', scientificName: 'Micranthemum umbrosum', category: 'plant', bioloadFactor: 0, adultSizeCm: 12, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Najas', scientificName: 'Najas guadalupensis', category: 'plant', bioloadFactor: 0, adultSizeCm: 40, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Lysimachia nummularia', scientificName: 'Lysimachia nummularia', category: 'plant', bioloadFactor: 0, adultSizeCm: 10, temperament: 'plante d\'aquarium', minTankLiters: 20, swimZone: 'bottom', solitary: false },
];

const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Nom scientifique à afficher : celui enregistré sur la fiche, sinon celui du
// catalogue quand le nom commun correspond. Renvoie null si on ne le connaît pas.
export function scientificNameOf(commonName: string, stored?: string | null): string | null {
  if (stored && stored.trim()) return stored.trim();
  const hit = SPECIES_CATALOG.find((s) => norm(s.commonName) === norm(commonName));
  return hit ? hit.scientificName : null;
}

// Recherche insensible aux accents et à l'ordre des mots (« tetra citron »,
// « citron tetra »). Les noms qui commencent par la saisie passent en premier.
export function searchSpecies(query: string): SpeciesReference[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const words = q.split(/\s+/);
  const hits = SPECIES_CATALOG.filter((s) => {
    const hay = norm(`${s.commonName} ${s.scientificName}`);
    return words.every((w) => hay.includes(w));
  });
  hits.sort((a, b) => Number(norm(b.commonName).startsWith(q)) - Number(norm(a.commonName).startsWith(q)));
  return hits.slice(0, 10);
}
