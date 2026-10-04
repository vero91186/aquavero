import type { Product, ProductCategory } from '@/types/database';

// Bactéries nitrifiantes en flacon : un traitement versé dans le bac, pas un
// conditionneur ajouté à l'eau neuve. Si la fiche a été enregistrée dans une
// autre catégorie (la recherche IA les range souvent en conditionneur), on les
// reconnaît à leur nom pour ne pas les proposer au changement d'eau.
const BACTERIA_NAME =
  /stabilit|safestart|safe start|bio ?elixi|elixir|microbe[- ]?lift|nitrivec|colony|zyme|bacteri|bactéri|biodigest|nitrifi|bio ?starter|startbac|bakto|start ?bac|filter ?start/i;

export function productCategoryOf(p: Pick<Product, 'name' | 'category'>): ProductCategory {
  if ((p.category === 'conditioner' || p.category === 'other') && BACTERIA_NAME.test(p.name)) return 'bacteria';
  return p.category;
}
