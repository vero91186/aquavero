import type { FeedingPlanItem, FeedingSlot, Livestock, MaintenanceLog } from '@/types/database';

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const SLOT_LABELS: Record<FeedingSlot, string> = {
  morning: 'Matin',
  evening: 'Soir (extinction des lumières)',
};

// 0 = lundi … 6 = dimanche (getDay() renvoie 0 pour dimanche).
export const weekdayOf = (d: Date) => (d.getDay() + 6) % 7;

export interface DefaultFeedingItem {
  weekday: number;
  slot: FeedingSlot;
  food_name: string;
  quantity: string | null;
  notes: string | null;
}

const FLAKES = 'JBL ProNovo Bel Flakes S';
const WAFERS = 'Ocean Nutrition Shrimp Wafers';
const TABS = 'JBL ProNovo Corydoras Tab M';

// Planning type pour 30 crevettes, des escargots, un ancistrus et un tétra :
// les flocons du matin sont pour le tétra (les miettes profitent aux crevettes),
// le repas du soir nourrit le fond. Le dimanche est un jour de jeûne.
export const DEFAULT_FEEDING_PLAN: DefaultFeedingItem[] = [
  ...[0, 1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    slot: 'morning' as const,
    food_name: FLAKES,
    quantity: '5 à 8 flocons',
    notes: 'Pour le tétra : tout doit être mangé en 1 à 2 minutes.',
  })),
  { weekday: 0, slot: 'evening', food_name: WAFERS, quantity: '1 cuillère rase', notes: 'Paillettes pour les crevettes et les escargots.' },
  { weekday: 3, slot: 'evening', food_name: TABS, quantity: '2 à 3 pastilles', notes: 'Pastilles qui coulent : surtout pour l’ancistrus, les crevettes grignotent.' },
  { weekday: 5, slot: 'evening', food_name: 'Rondelle de courgette blanchie', quantity: '1 rondelle', notes: 'À retirer au bout de 24 h.' },
];

// --- Planning généré d'après le peuplement du bac -------------------------

type Group = 'surface' | 'bottomFish' | 'carnivore' | 'shrimp' | 'snail';

const BOTTOM_FISH = /corydora|cory\b|ancistrus|otocinclus|\bloche|kuhli|botia|panda|pléco|pleco|synodontis/i;
const CARNIVORE = /pseudomugil|gourami|betta|killi|combattant|apistogramma|ram\b/i;
const SNAIL = /neritina|nérite|nerite|clithon|escargot|snail|planorbe|physe|mélanie|melanie|helenta/i;

function groupsOf(l: Livestock): Group[] {
  const name = `${l.species_common_name} ${l.species_scientific_name ?? ''}`;
  if (l.category === 'invertebrate') {
    if (SNAIL.test(name)) return ['snail'];
    return ['shrimp'];
  }
  if (l.category !== 'fish') return [];
  if (BOTTOM_FISH.test(name) || l.swim_zone === 'bottom') return ['bottomFish'];
  // Poisson de surface ou de milieu : paillettes le matin, et du surgelé pour les espèces carnivores.
  return CARNIVORE.test(name) ? ['surface', 'carnivore'] : ['surface'];
}

export interface PopulationCounts {
  surface: number;
  bottomFish: number;
  carnivore: number;
  shrimp: number;
  snail: number;
}

export function populationCounts(livestock: Livestock[]): PopulationCounts {
  const c: PopulationCounts = { surface: 0, bottomFish: 0, carnivore: 0, shrimp: 0, snail: 0 };
  for (const l of livestock) for (const g of groupsOf(l)) c[g] += Math.max(l.quantity, 0);
  return c;
}

// Phrase affichée sous le bouton « Charger le planning » : ce sur quoi il s'appuie.
export function describePopulation(livestock: Livestock[]): string {
  const living = livestock.filter((l) => l.category === 'fish' || l.category === 'invertebrate');
  return living.map((l) => `${l.quantity} ${l.species_common_name}`).join(', ');
}

const SPOON = (n: number) => (n <= 15 ? '1/2 cuillère rase' : n <= 40 ? '1 cuillère rase' : '2 cuillères rases');

function flakeQuantity(n: number): string {
  if (n <= 1) return '5 à 8 flocons';
  if (n <= 8) return 'Une petite pincée';
  if (n <= 20) return 'Une pincée';
  return 'Deux pincées';
}

function tabQuantity(n: number): string {
  if (n <= 3) return '2 à 3 pastilles';
  return `${Math.ceil(n / 4)} pastilles`;
}

function frozenQuantity(n: number): string {
  if (n <= 6) return '1/2 cube';
  if (n <= 15) return '1 cube';
  return '2 cubes';
}

const FROZEN = 'Artémias surgelées';
const LOLLY = 'GlasGarten Shrimp Lolly';

// Planning hebdomadaire déduit du peuplement : repas du matin pour les poissons de
// surface et de milieu, repas coulant du soir pour le fond, les crevettes et les
// escargots (plus un bâtonnet hebdomadaire pour les crevettes), surgelé pour les espèces carnivores. Les quantités suivent l'effectif ;
// le dimanche reste un jour de jeûne. Un groupe arrivé depuis moins de 7 jours
// reçoit une demi-ration (le filtre n'a pas encore absorbé sa charge).
export function buildFeedingPlan(livestock: Livestock[], today: Date = new Date()): DefaultFeedingItem[] {
  const c = populationCounts(livestock);
  if (c.surface + c.bottomFish + c.shrimp + c.snail === 0) return DEFAULT_FEEDING_PLAN;

  const plan: DefaultFeedingItem[] = [];
  const weekAgo = today.getTime() - 7 * 24 * 3600 * 1000;
  const recent = livestock.some((l) => (l.category === 'fish') && l.added_at && new Date(l.added_at).getTime() > weekAgo);
  const soft = recent ? ' Demi-ration pendant la première semaine d’un nouveau groupe.' : '';

  if (c.surface > 0) {
    const morning = [0, 1, 2, 3, 4, 5];
    // Deux matins par semaine remplacés par du surgelé pour les carnivores (mercredi, samedi).
    const frozenDays = c.carnivore > 0 ? [2, 5] : [];
    for (const weekday of morning) {
      if (frozenDays.includes(weekday)) {
        plan.push({ weekday, slot: 'morning', food_name: FROZEN, quantity: frozenQuantity(c.carnivore), notes: `Pour les poissons carnivores : décongeler dans un peu d’eau du bac.${soft}` });
      } else {
        plan.push({
          weekday,
          slot: 'morning',
          food_name: FLAKES,
          quantity: flakeQuantity(c.surface),
          notes: c.surface === 1 ? `Tout doit être mangé en 1 à 2 minutes.${soft}` : `Tout doit être mangé en 1 à 2 minutes, avant que ça ne coule.${soft}`,
        });
      }
    }
  }

  // Repas du soir (extinction des lumières) : les Corydoras et l'ancistrus sont actifs à ce moment.
  if (c.shrimp + c.snail + c.bottomFish > 0) {
    const grazers = c.shrimp + c.snail;
    if (grazers > 0) {
      plan.push({ weekday: 0, slot: 'evening', food_name: WAFERS, quantity: SPOON(c.shrimp), notes: 'Paillettes pour les crevettes et les escargots.' });
    }
    // Un bâtonnet par semaine pour les crevettes (deux au-delà de 60), le mercredi soir.
    if (c.shrimp > 0) {
      plan.push({ weekday: 2, slot: 'evening', food_name: LOLLY, quantity: c.shrimp > 60 ? '2 bâtonnets' : '1 bâtonnet', notes: 'Un par semaine : à retirer au bout de 24 h s’il en reste.' });
    }
    if (c.bottomFish > 0) {
      const days = c.bottomFish >= 5 ? [1, 3] : [3];
      for (const weekday of days) {
        plan.push({ weekday, slot: 'evening', food_name: TABS, quantity: tabQuantity(c.bottomFish), notes: `Pastilles qui coulent pour les poissons de fond ; les crevettes grignotent aussi.${soft}` });
      }
    }
    plan.push({ weekday: 5, slot: 'evening', food_name: 'Rondelle de courgette blanchie', quantity: '1 rondelle', notes: 'À retirer au bout de 24 h.' });
  }

  return plan;
}

// Quantités proposées selon le type d'aliment, reconnu à son nom. La première
// est la valeur préremplie ; les autres apparaissent dans la liste de suggestions.
const QUANTITY_HINTS: { match: RegExp; quantities: string[] }[] = [
  { match: /lolli|bâtonnet|batonnet|stick|stiel/i, quantities: ['1 bâtonnet', '1/2 bâtonnet'] },
  { match: /flake|flocon/i, quantities: ['5 à 8 flocons', 'Une pincée'] },
  { match: /wafer|paillette|galette/i, quantities: ['1 paillette', '1/2 paillette', '1 cuillère rase'] },
  { match: /tab|pastille|comprim/i, quantities: ['2 à 3 pastilles', '1 pastille'] },
  { match: /granul|pellet|micro/i, quantities: ['Une pincée', '5 à 10 granulés'] },
  { match: /courgette|concombre|épinard|epinard|carotte|légume|legume/i, quantities: ['1 rondelle', '1 petit morceau'] },
  { match: /artemia|artémia|daphnie|cyclop|moustique|mysis|surgel|congel/i, quantities: ['1 cube', '1/2 cube'] },
  { match: /feuille|noix|aulne|catappa|mûrier|murier|bouleau/i, quantities: ['1 feuille', '1 petit morceau'] },
];

const GENERIC_QUANTITIES = ['Une pincée', '1 cuillère rase', '1 pastille', '1 bâtonnet'];

export function quantitySuggestions(foodName: string): string[] {
  const hit = QUANTITY_HINTS.find((h) => h.match.test(foodName));
  return hit ? hit.quantities : GENERIC_QUANTITIES;
}

// Quantité préremplie quand on choisit un aliment connu ; null si rien de précis à proposer.
export function defaultQuantity(foodName: string): string | null {
  const hit = QUANTITY_HINTS.find((h) => h.match.test(foodName));
  return hit ? hit.quantities[0] : null;
}

export function itemsForDay(items: FeedingPlanItem[], weekday: number): FeedingPlanItem[] {
  return items
    .filter((i) => i.weekday === weekday)
    .sort((a, b) => (a.slot === b.slot ? a.created_at.localeCompare(b.created_at) : a.slot === 'morning' ? -1 : 1));
}

// Texte écrit dans le journal quand un repas est coché : il sert aussi à
// retrouver le repas déjà noté ce jour-là.
export function feedingLogText(i: Pick<FeedingPlanItem, 'food_name' | 'quantity'>): string {
  return i.quantity ? `${i.food_name}, ${i.quantity}` : i.food_name;
}

const sameLocalDay = (iso: string, d: Date) => {
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
};

// Entrées du journal (type « Alimentation ») qui correspondent à ce repas ce jour-là.
export function mealLogs(item: FeedingPlanItem, logs: MaintenanceLog[], day: Date): MaintenanceLog[] {
  const text = feedingLogText(item);
  return logs.filter((l) => l.task_type === 'feeding' && l.description === text && sameLocalDay(l.performed_at, day));
}
