import type { LivestockCategory } from '@/types/database';

// Catalogue indicatif d'espèces courantes, pour préremplir l'ajout au
// peuplement (facteur de charge biologique, taille adulte, tempérament,
// volume minimal recommandé). Reste entièrement optionnel : n'importe quelle
// espèce hors catalogue peut être saisie librement à la main.
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
  sexNote?: string;
}

export const SPECIES_CATALOG: SpeciesReference[] = [
  // --- Poissons d'eau douce : petits paisibles ---
  { commonName: 'Néon bleu', scientificName: 'Paracheirodon innesi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60 },
  { commonName: 'Néon cardinalis', scientificName: 'Paracheirodon axelrodi', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 60 },
  { commonName: 'Guppy', scientificName: 'Poecilia reticulata', category: 'fish', bioloadFactor: 1.1, adultSizeCm: 5, temperament: 'paisible, grégaire', minTankLiters: 40, sexNote: 'vivipare — 1 mâle pour 2-3 femelles pour éviter le harcèlement' },
  { commonName: 'Platy', scientificName: 'Xiphophorus maculatus', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire', minTankLiters: 60, sexNote: 'vivipare — 1 mâle pour 2-3 femelles' },
  { commonName: 'Molly', scientificName: 'Poecilia sphenops', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 8, temperament: 'paisible, grégaire', minTankLiters: 80, sexNote: 'vivipare — 1 mâle pour 2-3 femelles' },
  { commonName: 'Danio zébré', scientificName: 'Danio rerio', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 5, temperament: 'paisible, très actif', minTankLiters: 60 },
  { commonName: 'Rasbora Harlequin', scientificName: 'Trigonostigma heteromorpha', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 4, temperament: 'paisible, grégaire', minTankLiters: 60 },
  { commonName: 'Boraras', scientificName: 'Boraras spp.', category: 'fish', bioloadFactor: 0.5, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 40 },
  { commonName: 'Poisson-hachette argenté', scientificName: 'Gasteropelecus sternicla', category: 'fish', bioloadFactor: 1.2, adultSizeCm: 6, temperament: 'paisible, grégaire, surface', minTankLiters: 80 },

  // --- Poissons de fond / algivores ---
  { commonName: 'Corydoras sterbai', scientificName: 'Corydoras sterbai', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'paisible, grégaire, fond', minTankLiters: 80 },
  { commonName: 'Corydoras pygmée', scientificName: 'Corydoras pygmaeus', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 3, temperament: 'paisible, grégaire, fond', minTankLiters: 40 },
  { commonName: 'Ancistrus (bristlenose)', scientificName: 'Ancistrus sp.', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 13, temperament: 'paisible, territorial entre mâles', minTankLiters: 100, sexNote: 'un seul mâle par bac en général' },
  { commonName: 'Otocinclus', scientificName: 'Otocinclus sp.', category: 'fish', bioloadFactor: 0.6, adultSizeCm: 4, temperament: 'paisible, grégaire, algivore', minTankLiters: 60 },
  { commonName: 'Loche kuhli', scientificName: 'Pangio kuhlii', category: 'fish', bioloadFactor: 1.0, adultSizeCm: 10, temperament: 'paisible, grégaire, fouisseur', minTankLiters: 80 },

  // --- Cichlidés et poissons plus imposants ---
  { commonName: 'Ram bolivien', scientificName: 'Mikrogeophagus altispinosus', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 8, temperament: 'globalement paisible, territorial en reproduction', minTankLiters: 100 },
  { commonName: 'Scalaire', scientificName: 'Pterophyllum scalare', category: 'fish', bioloadFactor: 3.5, adultSizeCm: 15, temperament: 'semi-agressif, territorial', minTankLiters: 150 },
  { commonName: 'Gourami perlé', scientificName: 'Trichopodus leerii', category: 'fish', bioloadFactor: 2.5, adultSizeCm: 12, temperament: 'globalement paisible', minTankLiters: 120 },
  { commonName: 'Betta', scientificName: 'Betta splendens', category: 'fish', bioloadFactor: 1.3, adultSizeCm: 6, temperament: 'territorial, mâles incompatibles entre eux', minTankLiters: 40, sexNote: 'jamais deux mâles ensemble' },

  // --- Invertébrés d'eau douce ---
  { commonName: 'Crevette Red Cherry', scientificName: 'Neocaridina davidi', category: 'invertebrate', bioloadFactor: 0.15, adultSizeCm: 2, temperament: 'paisible, grégaire', minTankLiters: 20 },
  { commonName: 'Crevette Amano', scientificName: 'Caridina multidentata', category: 'invertebrate', bioloadFactor: 0.2, adultSizeCm: 4, temperament: 'paisible, algivore', minTankLiters: 40 },
  { commonName: 'Escargot Neritina', scientificName: 'Neritina natalensis', category: 'invertebrate', bioloadFactor: 0.3, adultSizeCm: 2.5, temperament: 'paisible, algivore', minTankLiters: 20 },
  { commonName: 'Planorbe', scientificName: 'Planorbidae', category: 'invertebrate', bioloadFactor: 0.1, adultSizeCm: 1.5, temperament: 'paisible, se reproduit vite', minTankLiters: 10 },

  // --- Plantes courantes ---
  { commonName: 'Vallisneria', scientificName: 'Vallisneria sp.', category: 'plant', bioloadFactor: 0, adultSizeCm: 40, temperament: 'plante de fond, pousse rapide', minTankLiters: 40 },
  { commonName: 'Cryptocoryne wendtii', scientificName: 'Cryptocoryne wendtii', category: 'plant', bioloadFactor: 0, adultSizeCm: 20, temperament: 'plante de premier plan/milieu, peu exigeante', minTankLiters: 20 },
  { commonName: 'Anubias nana', scientificName: 'Anubias barteri var. nana', category: 'plant', bioloadFactor: 0, adultSizeCm: 10, temperament: 'à fixer sur bois/roche, très peu exigeante', minTankLiters: 20 },
  { commonName: 'Mousse de Java', scientificName: 'Taxiphyllum barbieri', category: 'plant', bioloadFactor: 0, adultSizeCm: 5, temperament: 'à fixer, très peu exigeante', minTankLiters: 10 },
  { commonName: 'Fougère de Java', scientificName: 'Microsorum pteropus', category: 'plant', bioloadFactor: 0, adultSizeCm: 15, temperament: 'à fixer sur bois/roche', minTankLiters: 20 },

  // --- Marin / récifal courant ---
  { commonName: 'Poisson-clown Ocellaris', scientificName: 'Amphiprion ocellaris', category: 'fish', bioloadFactor: 2.0, adultSizeCm: 8, temperament: 'territorial en couple', minTankLiters: 100 },
  { commonName: 'Chirurgien bleu (Hepatus)', scientificName: 'Paracanthurus hepatus', category: 'fish', bioloadFactor: 4.0, adultSizeCm: 25, temperament: 'territorial, besoin de nage', minTankLiters: 400 },
  { commonName: 'Demoiselle bleue', scientificName: 'Chrysiptera cyanea', category: 'fish', bioloadFactor: 1.5, adultSizeCm: 7, temperament: 'territorial, agressif entre congénères', minTankLiters: 100 },
  { commonName: 'Crevette nettoyeuse', scientificName: 'Lysmata amboinensis', category: 'invertebrate', bioloadFactor: 0.4, adultSizeCm: 5, temperament: 'paisible, nettoyeuse', minTankLiters: 60 },
  { commonName: 'Corail champignon', scientificName: 'Discosoma sp.', category: 'coral', bioloadFactor: 0.1, adultSizeCm: 5, temperament: 'peu exigeant, lumière modérée', minTankLiters: 60 },
];

export function searchSpecies(query: string): SpeciesReference[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return SPECIES_CATALOG.filter(
    (s) => s.commonName.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q)
  ).slice(0, 8);
}
