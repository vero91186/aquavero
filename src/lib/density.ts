import type { Livestock, SwimZone } from "@/types/database";
import { scientificNameOf, swimZoneByName } from "@/lib/species-catalog";

// Un invertébré (crevette, escargot) pèse moins sur le bac qu'un poisson de
// même longueur : on le compte pour 30 % en « équivalent cm de poisson ».
export const INVERTEBRATE_COEF = 0.3;

export type DensityKind = "fish" | "invertebrate";

export interface DensityLine {
  id: string;
  name: string;
  scientificName?: string | null;
  sizeCm: number;
  quantity: number;
  kind: DensityKind;
  // true quand la ligne vient d'une espèce hypothétique (pas encore au bac)
  hypothetical?: boolean;
  zone?: SwimZone; // niveau de nage, pour la vue du bac
}

export interface DensityResult {
  fishCm: number;
  invertebrateCm: number;
  totalCm: number;
  animalCount: number;
  ratioNet: number; // cm équivalent par litre d'eau réelle
  ratioGross: number | null; // idem sur le volume brut, si renseigné
  litersPerAnimal: number | null;
  turnover: number | null; // renouvellements du volume par heure
  marginCm: number; // cm restants avant 1,5 cm/L (négatif = dépassement)
  volumeForLimit: number; // litres réels nécessaires pour rester à 1,5 cm/L
}

export type DensityLevelId = "aere" | "raisonnable" | "charge" | "surcharge";

export interface DensityLevel {
  id: DensityLevelId;
  label: string;
  message: string;
}

export const DENSITY_LIMIT = 1.5;
export const DENSITY_SCALE_MAX = 2.5;

export function linesFromLivestock(livestock: Livestock[]): DensityLine[] {
  return livestock
    .filter((l) => l.category === "fish" || l.category === "invertebrate")
    .map((l) => ({
      id: l.id,
      name: l.species_common_name,
      scientificName: scientificNameOf(
        l.species_common_name,
        l.species_scientific_name,
      ),
      sizeCm: l.adult_size_cm ?? 0,
      quantity: l.quantity,
      kind: l.category as DensityKind,
      // Fiche laissée à « milieu » (valeur par défaut) : on prend l'étage connu
      // du catalogue, par exemple le fond pour un Ancistrus.
      zone:
        l.swim_zone === "mid"
          ? (swimZoneByName(l.species_common_name, l.species_scientific_name) ??
            l.swim_zone)
          : l.swim_zone,
    }));
}

export function computeDensity(
  lines: DensityLine[],
  netLiters: number,
  grossLiters: number | null,
  flowLitersPerHour: number | null,
): DensityResult {
  let fishCm = 0;
  let invertebrateCm = 0;
  let animalCount = 0;
  for (const l of lines) {
    const qty = Math.max(0, l.quantity);
    const cm = Math.max(0, l.sizeCm) * qty;
    animalCount += qty;
    if (l.kind === "fish") fishCm += cm;
    else invertebrateCm += cm * INVERTEBRATE_COEF;
  }
  const totalCm = fishCm + invertebrateCm;
  const hasNet = netLiters > 0;
  return {
    fishCm,
    invertebrateCm,
    totalCm,
    animalCount,
    ratioNet: hasNet ? totalCm / netLiters : 0,
    ratioGross: grossLiters && grossLiters > 0 ? totalCm / grossLiters : null,
    litersPerAnimal: hasNet && animalCount > 0 ? netLiters / animalCount : null,
    turnover:
      hasNet && flowLitersPerHour && flowLitersPerHour > 0
        ? flowLitersPerHour / netLiters
        : null,
    marginCm: DENSITY_LIMIT * netLiters - totalCm,
    volumeForLimit: totalCm / DENSITY_LIMIT,
  };
}

export function densityLevel(ratio: number): DensityLevel {
  if (ratio < 1) {
    return {
      id: "aere",
      label: "Aéré",
      message:
        "Bac aéré : large marge, même pour un ajout ou une panne de filtre passagère.",
    };
  }
  if (ratio < DENSITY_LIMIT) {
    return {
      id: "raisonnable",
      label: "Raisonnable",
      message:
        "Densité raisonnable pour un bac planté et bien filtré. Introduis les animaux par vagues pour laisser la filtration suivre.",
    };
  }
  if (ratio < 2) {
    return {
      id: "charge",
      label: "Chargé",
      message:
        "Bac chargé : changements d'eau plus fréquents, nitrates à surveiller, pas d'ajout. Retirer quelques animaux redonne de la marge.",
    };
  }
  return {
    id: "surcharge",
    label: "Surcharge",
    message:
      "Surcharge probable : réduis la population ou vise un plus grand volume avant d’aller plus loin.",
  };
}

// Alternative « en proportion » : garde les mêmes espèces dans les mêmes
// proportions, mais ajuste les quantités pour viser une densité donnée
// (cm de poisson par litre d'eau réelle). On arrondit à l'entier inférieur,
// puis on complète animal par animal tant que la cible n'est pas dépassée.
export function scalePopulation(
  lines: DensityLine[],
  netLiters: number,
  targetRatio: number,
): DensityLine[] {
  const usable = lines.filter((l) => l.quantity > 0 && l.sizeCm > 0);
  if (netLiters <= 0 || usable.length === 0) return [];
  const weight = (l: DensityLine) =>
    l.sizeCm * (l.kind === "invertebrate" ? INVERTEBRATE_COEF : 1);
  const current = usable.reduce((s, l) => s + weight(l) * l.quantity, 0);
  const budget = targetRatio * netLiters;
  const f = budget / current;

  const out = usable.map((l) => ({
    ...l,
    quantity: Math.floor(l.quantity * f),
  }));
  let total = out.reduce((s, l) => s + weight(l) * l.quantity, 0);

  // Complète : on ajoute un animal à l'espèce la plus en retard sur sa proportion cible.
  for (let guard = 0; guard < 500; guard++) {
    let pick = -1;
    let bestGap = 0;
    out.forEach((l, i) => {
      if (total + weight(l) > budget + 1e-9) return;
      const gap = usable[i].quantity * f - l.quantity;
      if (gap > bestGap) {
        bestGap = gap;
        pick = i;
      }
    });
    if (pick < 0) break;
    out[pick].quantity += 1;
    total += weight(out[pick]);
  }
  return out.filter((l) => l.quantity > 0);
}

export interface ZoneDensity {
  zone: SwimZone;
  cm: number; // cm équivalent poisson dans cette zone
  count: number;
  fish: number;
  invertebrates: number;
  liters: number; // un tiers du volume réel par zone
  ratio: number; // cm par litre de la zone
}

// Charge par étage du bac : chaque zone (surface, milieu, fond) compte pour un
// tiers du volume réel. Les invertébrés vivent au fond. Indicatif : les poissons
// se déplacent, mais un fond saturé ou une surface vide se voit ici.
export function computeZoneDensity(
  lines: DensityLine[],
  netLiters: number,
): ZoneDensity[] {
  const zones: SwimZone[] = ["top", "mid", "bottom"];
  const liters = netLiters > 0 ? netLiters / 3 : 0;
  return zones.map((zone) => {
    let cm = 0;
    let count = 0;
    let fish = 0;
    let invertebrates = 0;
    for (const l of lines) {
      const z: SwimZone =
        l.kind === "invertebrate" ? "bottom" : (l.zone ?? "mid");
      if (z !== zone) continue;
      const qty = Math.max(0, l.quantity);
      count += qty;
      if (l.kind === "fish") fish += qty;
      else invertebrates += qty;
      cm +=
        Math.max(0, l.sizeCm) *
        qty *
        (l.kind === "invertebrate" ? INVERTEBRATE_COEF : 1);
    }
    return {
      zone,
      cm,
      count,
      fish,
      invertebrates,
      liters,
      ratio: liters > 0 ? cm / liters : 0,
    };
  });
}
