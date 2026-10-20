import type { FeedingPlanItem, FeedingSlot, MaintenanceLog } from '@/types/database';

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
