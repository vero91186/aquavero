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
  { commonName: 'Corydoras adolfoi', scientificName: 'Corydoras adolfoi', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 5, temperament: 'paisible, grégaire, fond', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras sterbai', scientificName: 'Corydoras sterbai', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras pygmée', scientificName: 'Corydoras pygmaeus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3, temperament: 'paisible, grégaire, fond', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Ancistrus bristlenose (sp.)', scientificName: 'Ancistrus sp.', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Otocinclus', scientificName: 'Otocinclus sp.', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche kuhli (Pangio kuhlii)', scientificName: 'Pangio kuhlii', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 10, temperament: 'paisible, grégaire, fouisseur', minTankLiters: 80, swimZone: 'bottom', solitary: false },

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
  { commonName: 'Tétra royal', scientificName: 'Inpaichthys kerri', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
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
  { commonName: 'Ancistrus albinos (bristlenose)', scientificName: 'Ancistrus cirrhosus', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, swimZone: 'bottom', solitary: false },
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

  // --- Compléments 2 ---
  { commonName: 'Tétra néon vert', scientificName: 'Paracheirodon simulans', category: 'fish', bioloadFactor: 0.7, adultSizeCm: 3, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra de Buenos Aires', scientificName: 'Hyphessobrycon anisitsi', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'actif, mordille parfois les nageoires', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra rouge (Serpae)', scientificName: 'Hyphessobrycon eques', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 4.5, temperament: 'actif, mordille parfois les nageoires', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra fantôme rouge', scientificName: 'Hyphessobrycon sweglesi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra fantôme noir', scientificName: 'Hyphessobrycon megalopterus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra diamant', scientificName: 'Moenkhausia pittieri', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra lumière du jour (Glowlight)', scientificName: 'Hemigrammus erythrozonus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra Rummy-nose faux', scientificName: 'Petitella georgiae', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra cuivré', scientificName: 'Hasemania nana', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire, actif', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra tête et queue de feu', scientificName: 'Hemigrammus ocellifer', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra à bande noire', scientificName: 'Gymnocorymbus ternetzi', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'actif, peut mordiller', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra à deux bandes', scientificName: 'Hyphessobrycon bifasciatus', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra du Pérou', scientificName: 'Hyphessobrycon peruvianus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson hachette marbré', scientificName: 'Carnegiella marthae', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 3.5, temperament: 'paisible, grégaire, surface', minTankLiters: 80, swimZone: 'top', solitary: false },
  { commonName: 'Poisson-crayon à trois lignes', scientificName: 'Nannostomus trifasciatus', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 6, temperament: 'paisible, grégaire, timide', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Poisson-crayon nain', scientificName: 'Nannostomus marginatus', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 3.5, temperament: 'paisible, grégaire, timide', minTankLiters: 40, swimZone: 'top', solitary: false },
  { commonName: 'Barbus tigre', scientificName: 'Barbodes tetrazona', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'actif, mordille les nageoires', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus de Schubert (doré)', scientificName: 'Barbodes semifasciolatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'paisible, grégaire, actif', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus rosé', scientificName: 'Pethia conchonius', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 8, temperament: 'paisible, grégaire, actif', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus odessa', scientificName: 'Pethia padamya', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus de Denison', scientificName: 'Sahyadria denisonii', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 12, temperament: 'paisible, grégaire, très actif', minTankLiters: 250, swimZone: 'mid', solitary: false },
  { commonName: 'Danio perlé', scientificName: 'Danio albolineatus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible, grégaire, très actif', minTankLiters: 80, swimZone: 'top', solitary: false },
  { commonName: 'Danio géant', scientificName: 'Devario aequipinnatus', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'paisible, grégaire, très actif', minTankLiters: 150, swimZone: 'top', solitary: false },
  { commonName: 'Danio bleu', scientificName: 'Danio kerri', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 4, temperament: 'paisible, grégaire, actif', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Rasbora d\'Einthoven', scientificName: 'Rasbora einthovenii', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 8, temperament: 'paisible, grégaire', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora tête de lance', scientificName: 'Rasbora trilineata', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 10, temperament: 'paisible, grégaire, très actif', minTankLiters: 120, swimZone: 'top', solitary: false },
  { commonName: 'Rasbora à ligne rouge', scientificName: 'Rasbora pauciperforata', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 7, temperament: 'paisible, grégaire', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora clown', scientificName: 'Rasbora kalochroma', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 7, temperament: 'paisible, grégaire', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora nain', scientificName: 'Boraras brigittae', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 30, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora Boraras urophthalmoides', scientificName: 'Boraras urophthalmoides', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 30, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora Boraras maculatus', scientificName: 'Boraras maculatus', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 30, swimZone: 'mid', solitary: false },
  { commonName: 'Molly voile (Yucatan)', scientificName: 'Poecilia velifera', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 12, temperament: 'paisible, grégaire', minTankLiters: 150, swimZone: 'mid', solitary: false },
  { commonName: 'Corydoras nain (hastatus)', scientificName: 'Corydoras hastatus', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 3, temperament: 'paisible, grégaire, fond/milieu', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras julii', scientificName: 'Corydoras trilineatus', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras leopard', scientificName: 'Corydoras leopardus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras mimic', scientificName: 'Corydoras sp. CW', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire, fond', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras éclair noir', scientificName: 'Corydoras schwartzi', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras albinos', scientificName: 'Corydoras aeneus var. albino', category: 'fish', bioloadFactor: 1.4, adultSizeCm: 7, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Brochet-poisson Rineloricaria', scientificName: 'Rineloricaria sp.', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 12, temperament: 'paisible, fond', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche Botia queue rouge', scientificName: 'Yasuhikotakia modesta', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 12, temperament: 'actif, semi-agressif', minTankLiters: 200, swimZone: 'bottom', solitary: false },
  { commonName: 'Otocinclus affinis', scientificName: 'Otocinclus affinis', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Ancistrus L144 (bleu)', scientificName: 'Ancistrus sp. L144', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Ancistrus dolichopterus', scientificName: 'Ancistrus dolichopterus', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Pléco Peckoltia', scientificName: 'Peckoltia vittata', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 12, temperament: 'paisible', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Pléco Parotocinclus', scientificName: 'Parotocinclus maculicauda', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Pléco Hypancistrus L333', scientificName: 'Hypancistrus sp. L333', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'paisible, territorial', minTankLiters: 120, swimZone: 'bottom', solitary: false },
  { commonName: 'Gourami chocolat', scientificName: 'Sphaerichthys osphromenoides', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 5, temperament: 'paisible, sensible', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Gourami nain à lèvres épaisses', scientificName: 'Trichogaster labiosa', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'paisible', minTankLiters: 80, swimZone: 'top', solitary: false },
  { commonName: 'Gourami croissant', scientificName: 'Trichopsis vittata', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 6, temperament: 'paisible, timide', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Betta imbellis', scientificName: 'Betta imbellis', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'territorial, mâles incompatibles entre eux', minTankLiters: 40, swimZone: 'top', solitary: true, sexNote: 'jamais deux mâles ensemble' },
  { commonName: 'Cichlidé Nannacara', scientificName: 'Nannacara anomala', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 7, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé Laetacara', scientificName: 'Laetacara curviceps', category: 'fish', bioloadFactor: 1.8, adultSizeCm: 8, temperament: 'paisible à territorial en reproduction', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé Krib', scientificName: 'Pelvicachromis pulcher', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé Cichlasoma Keyhole', scientificName: 'Cleithracara maronii', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 12, temperament: 'paisible', minTankLiters: 150, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé zèbre Pelvicachromis taeniatus', scientificName: 'Pelvicachromis taeniatus', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 9, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Poisson arc-en-ciel nain', scientificName: 'Melanotaenia praecox', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, actif', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson arc-en-ciel turquoise', scientificName: 'Melanotaenia lacustris', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 10, temperament: 'paisible, grégaire, très actif', minTankLiters: 200, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson arc-en-ciel de Madagascar', scientificName: 'Bedotia geayi', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'paisible, grégaire', minTankLiters: 150, swimZone: 'mid', solitary: false },
  { commonName: 'Pseudomugil gertrudae (arc-en-ciel nain)', scientificName: 'Pseudomugil gertrudae', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 3, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Killi Aphyosemion', scientificName: 'Aphyosemion australe', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 6, temperament: 'paisible', minTankLiters: 40, swimZone: 'top', solitary: false },
  { commonName: 'Killi Aplocheilus lineatus', scientificName: 'Aplocheilus lineatus', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 10, temperament: 'prédateur de petite taille, surface', minTankLiters: 100, swimZone: 'top', solitary: false },
  { commonName: 'Tétra veuve (Longfin)', scientificName: 'Gymnocorymbus thayeri', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'actif', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson-chat Synodontis nigriventris (à l\'envers)', scientificName: 'Synodontis nigriventris', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'paisible, nage à l\'envers', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Poisson-chat Pictus', scientificName: 'Pimelodus pictus', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 12, temperament: 'actif, mange les très petits poissons', minTankLiters: 150, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Rili (Red Rili)', scientificName: 'Neocaridina davidi var. rili', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Black Rose', scientificName: 'Neocaridina davidi var. black', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Orange Sakura', scientificName: 'Neocaridina davidi var. orange', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Taiwan Bee', scientificName: 'Caridina logemanni', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2.5, temperament: 'paisible, exigeante sur l\'eau', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette fantôme', scientificName: 'Palaemonetes paludosus', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 4, temperament: 'paisible, mais peut chasser de petites crevettes', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina Tiger', scientificName: 'Neritina turrita', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2.5, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina Zébré', scientificName: 'Clithon corona', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 2, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina Cornu', scientificName: 'Vittina semiconica', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2.5, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina Pulligera', scientificName: 'Neripteron pulligerum', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2.5, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot pomme (Pomacea)', scientificName: 'Pomacea diffusa', category: 'invertebrate', bioloadFactor: 0.6, adultSizeCm: 5, temperament: 'paisible, mange les plantes tendres', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Marisa', scientificName: 'Marisa cornuarietis', category: 'invertebrate', bioloadFactor: 0.6, adultSizeCm: 5, temperament: 'mange les plantes', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Bellamya', scientificName: 'Bellamya sp.', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 4, temperament: 'paisible, vivipare', minTankLiters: 40, swimZone: 'bottom', solitary: false },

  // --- Compléments 3 ---
  { commonName: 'Danio choprae (Glowlight)', scientificName: 'Danio choprae', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3.5, temperament: 'paisible, grégaire, actif', minTankLiters: 40, swimZone: 'top', solitary: false },
  { commonName: 'Danio de Tinwini', scientificName: 'Danio tinwini', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3, temperament: 'paisible, grégaire', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Rasbora axelrodi', scientificName: 'Sundadanio axelrodi', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2.5, temperament: 'paisible, grégaire, timide', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus nain doré', scientificName: 'Pethia gelius', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 50, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus noir (Nigrofasciata)', scientificName: 'Pethia nigrofasciata', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, actif', minTankLiters: 80, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus à bande (Vittatus)', scientificName: 'Puntius vittatus', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Barbus ticto', scientificName: 'Pethia ticto', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 10, temperament: 'paisible, grégaire, actif', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Corydoras poivré', scientificName: 'Corydoras paleatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'paisible, grégaire, fond', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras axelrodi', scientificName: 'Corydoras axelrodi', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 5, temperament: 'paisible, grégaire, fond', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras émeraude (Brochis)', scientificName: 'Brochis splendens', category: 'fish', bioloadFactor: 1.6, adultSizeCm: 8, temperament: 'paisible, grégaire, fond', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Corydoras à queue rayée (Dianema)', scientificName: 'Dianema urostriata', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 10, temperament: 'paisible, grégaire, fond', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Otocinclus macrospilus', scientificName: 'Otocinclus macrospilus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche Pangio oblonga', scientificName: 'Pangio oblonga', category: 'fish', bioloadFactor: 0.9, adultSizeCm: 10, temperament: 'paisible, grégaire, fouisseur, nocturne', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Loche zèbre (Botia striata)', scientificName: 'Botia striata', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'actif, grégaire', minTankLiters: 150, swimZone: 'bottom', solitary: false },
  { commonName: 'Limia à ventre noir', scientificName: 'Limia nigrofasciata', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Poisson-moustique nain', scientificName: 'Heterandria formosa', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 3, temperament: 'paisible, vivipare', minTankLiters: 20, swimZone: 'top', solitary: false },
  { commonName: 'Killi gardneri', scientificName: 'Fundulopanchax gardneri', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible à territorial entre mâles', minTankLiters: 60, swimZone: 'top', solitary: false },
  { commonName: 'Killi Pachypanchax', scientificName: 'Pachypanchax playfairii', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 8, temperament: 'semi-agressif entre mâles', minTankLiters: 100, swimZone: 'top', solitary: false },
  { commonName: 'Apistogramma macmasteri', scientificName: 'Apistogramma macmasteri', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Apistogramma nijsseni', scientificName: 'Apistogramma nijsseni', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Apistogramma panduro', scientificName: 'Apistogramma panduro', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 7, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false, sexNote: '1 mâle pour 2-3 femelles' },
  { commonName: 'Pelvicachromis subocellatus', scientificName: 'Pelvicachromis subocellatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 8, temperament: 'territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé à damier (Dicrossus)', scientificName: 'Dicrossus filamentosus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 6, temperament: 'paisible, territorial en reproduction', minTankLiters: 80, swimZone: 'bottom', solitary: false },
  { commonName: 'Cichlidé Taeniacara', scientificName: 'Taeniacara candidi', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 4.5, temperament: 'paisible', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Gourami nain croassant', scientificName: 'Trichopsis pumila', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 3.5, temperament: 'paisible, timide', minTankLiters: 30, swimZone: 'top', solitary: false },
  { commonName: 'Poisson paradis', scientificName: 'Macropodus opercularis', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 10, temperament: 'semi-agressif, territorial', minTankLiters: 100, swimZone: 'top', solitary: false },
  { commonName: 'Badis badis', scientificName: 'Badis badis', category: 'fish', bioloadFactor: 0.8, adultSizeCm: 6, temperament: 'paisible, territorial', minTankLiters: 60, swimZone: 'bottom', solitary: false },
  { commonName: 'Dario écarlate', scientificName: 'Dario dario', category: 'fish', bioloadFactor: 0.4, adultSizeCm: 2.5, temperament: 'paisible, timide, eau fraîche', minTankLiters: 30, swimZone: 'bottom', solitary: false },
  { commonName: 'Arc-en-ciel filamenteux', scientificName: 'Iriatherina werneri', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 5, temperament: 'paisible, grégaire, délicat', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra Ruby', scientificName: 'Axelrodia riesei', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 2.5, temperament: 'paisible, grégaire, timide', minTankLiters: 40, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra voilier', scientificName: 'Hyphessobrycon rosaceus', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra oblique', scientificName: 'Thayeria obliqua', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 7, temperament: 'paisible, grégaire', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Tétra à croix blanche', scientificName: 'Hemigrammus rodwayi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4.5, temperament: 'paisible, grégaire', minTankLiters: 60, swimZone: 'mid', solitary: false },
  { commonName: 'Hatchet géant', scientificName: 'Gasteropelecus levis', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, surface, bac couvert', minTankLiters: 100, swimZone: 'top', solitary: false },
  { commonName: 'Poisson-feuille d\'Amazonie', scientificName: 'Monocirrhus polyacanthus', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'prédateur embusqué, incompatible avec petits poissons', minTankLiters: 100, swimZone: 'mid', solitary: false },
  { commonName: 'Crevette Blue Bolt', scientificName: 'Caridina cf. cantonensis var. blue', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2.5, temperament: 'paisible, exigeante sur l\'eau', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Red Nose', scientificName: 'Caridina gracilirostris', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 4, temperament: 'paisible, algivore', minTankLiters: 40, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette Neocaridina palmata', scientificName: 'Neocaridina palmata', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2.5, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Crevette éventail (Atya)', scientificName: 'Atya gabonensis', category: 'invertebrate', bioloadFactor: 0.4, adultSizeCm: 10, temperament: 'paisible, filtre le courant', minTankLiters: 100, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Neritina chinensis', scientificName: 'Neritina chinensis', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2, temperament: 'paisible, algivore', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Escargot Physe', scientificName: 'Physa acuta', category: 'invertebrate', bioloadFactor: 0.1, adultSizeCm: 1.5, temperament: 'paisible, prolifère', minTankLiters: 10, swimZone: 'bottom', solitary: false },

  // --- Crevette Bloody Mary et variétés d'Ancistrus ---
  { commonName: 'Crevette Bloody Mary', scientificName: 'Neocaridina davidi var. Bloody Mary', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 3, temperament: 'paisible, grégaire', minTankLiters: 20, swimZone: 'bottom', solitary: false },
  { commonName: 'Ancistrus commun (bristlenose)', scientificName: 'Ancistrus triradiatus', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus voile (longfin)', scientificName: 'Ancistrus sp. var. longfin', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus Temminckii', scientificName: 'Ancistrus temminckii', category: 'fish', bioloadFactor: 2.8, adultSizeCm: 15, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 120, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus claro', scientificName: 'Ancistrus claro', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus ranunculus (L34)', scientificName: 'Ancistrus ranunculus', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus Super Red', scientificName: 'Ancistrus sp. var. super red', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus Calico', scientificName: 'Ancistrus sp. var. calico', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus Gold (doré)', scientificName: 'Ancistrus sp. var. gold', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Ancistrus Starlight', scientificName: 'Ancistrus sp. var. starlight', category: 'fish', bioloadFactor: 2.3, adultSizeCm: 12, temperament: 'paisible, territorial entre mâles, grotte requise', minTankLiters: 100, swimZone: 'bottom', solitary: false, sexNote: 'un seul mâle par bac en général' },
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
    const hay = norm(`${s.commonName} ${s.scientificName} ${s.swimZone === 'bottom' ? 'fond' : s.swimZone === 'top' ? 'surface' : 'milieu'}`);
    return words.every((w) => hay.includes(w));
  });
  hits.sort((a, b) => Number(norm(b.commonName).startsWith(q)) - Number(norm(a.commonName).startsWith(q)));
  return hits.slice(0, 15);
}

// Effectif minimal conseillé pour une espèce de banc (null si elle n'en a pas
// besoin). Déduit du tempérament « grégaire » et de la taille : les très petits
// poissons se sentent en sécurité à 8-10, les autres à 6, les grands à 5.
export function schoolMinOf(ref: Pick<SpeciesReference, 'temperament' | 'adultSizeCm' | 'category' | 'commonName'>): number | null {
  if (!/grégaire/i.test(ref.temperament)) return null;
  if (ref.category === 'invertebrate') return /crevette/i.test(ref.commonName) ? 6 : null;
  if (/corydoras|loche|pangio|botia|otocinclus/i.test(ref.commonName)) return 6;
  if (ref.adultSizeCm <= 3.5) return 8;
  if (ref.adultSizeCm <= 6.5) return 6;
  return 5;
}

// Même chose à partir d'un nom enregistré (commun ou scientifique), pour les
// lignes d'un peuplement. null si l'espèce est hors catalogue ou sans banc.
export function schoolMinByName(name: string, scientific?: string | null): number | null {
  const n = norm(name);
  const sci = scientific ? norm(scientific) : null;
  const hit = SPECIES_CATALOG.find((s) => norm(s.commonName) === n || (sci && norm(s.scientificName) === sci));
  return hit ? schoolMinOf(hit) : null;
}
