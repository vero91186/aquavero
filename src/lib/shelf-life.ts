// Calcul de la date limite d'usage d'un produit ouvert, à partir de sa date
// d'ouverture et de sa durée de conservation estimée après ouverture.

export interface ShelfLifeStatus {
  discardDate: Date;
  daysLeft: number;
  level: 'ok' | 'soon' | 'expired';
}

export function computeShelfLife(openedAt: string | null, shelfLifeDays: number | null): ShelfLifeStatus | null {
  if (!openedAt || shelfLifeDays === null || shelfLifeDays === undefined) return null;
  const opened = new Date(openedAt);
  const discardDate = new Date(opened);
  discardDate.setDate(discardDate.getDate() + shelfLifeDays);

  const daysLeft = Math.ceil((discardDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let level: ShelfLifeStatus['level'] = 'ok';
  if (daysLeft < 0) level = 'expired';
  else if (daysLeft <= 14) level = 'soon';

  return { discardDate, daysLeft, level };
}
