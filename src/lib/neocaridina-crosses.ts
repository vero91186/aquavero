// Croisements entre couleurs de Neocaridina davidi : résultats probables, qui
// varient selon les lignées. Toutes les couleurs appartiennent à la même espèce,
// donc tout se croise et donne des descendants fertiles.

export type CrossStatus = 'pur' | 'stable' | 'variable' | 'sauvage';

export interface ShrimpColor {
  key: string;
  name: string;
  hex: string;
}

export interface CrossResult {
  /** 1 ou 2 couleurs (2 = case coupée en diagonale). */
  swatch: string[];
  label: string;
  status: CrossStatus;
}

const WILD = '#857b62';

export const SHRIMP_COLORS: ShrimpColor[] = [
  { key: 'red', name: 'Red cherry', hex: '#c4281f' },
  { key: 'orange', name: 'Orange', hex: '#ec7a1c' },
  { key: 'yellow', name: 'Jaune', hex: '#f2c230' },
  { key: 'green', name: 'Vert', hex: '#4f9a54' },
  { key: 'blue', name: 'Blue Dream', hex: '#2f6fc4' },
  { key: 'black', name: 'Noir', hex: '#1f1f24' },
  { key: 'choco', name: 'Chocolat', hex: '#5a3a26' },
  { key: 'wild', name: 'Sauvage', hex: WILD },
];

// Clé « i-j » avec i <= j (le croisement est symétrique).
const CROSSES: Record<string, CrossResult> = {
  '0-0': { swatch: ['#c4281f'], label: 'Rouge, intensité variable', status: 'pur' },
  '1-1': { swatch: ['#ec7a1c'], label: 'Orange', status: 'pur' },
  '2-2': { swatch: ['#f2c230'], label: 'Jaune', status: 'pur' },
  '3-3': { swatch: ['#4f9a54'], label: 'Vert', status: 'pur' },
  '4-4': { swatch: ['#2f6fc4'], label: 'Bleu, nuances variables', status: 'pur' },
  '5-5': { swatch: ['#1f1f24'], label: 'Noir', status: 'pur' },
  '6-6': { swatch: ['#5a3a26'], label: 'Chocolat', status: 'pur' },
  '7-7': { swatch: [WILD], label: 'Brun, gris ou vert sauvage', status: 'pur' },
  '0-1': { swatch: ['#d4441a', '#e86a1a'], label: 'Orange foncé à rouge', status: 'stable' },
  '0-2': { swatch: ['#e5622a', '#ee8a2a'], label: 'Orange à rouge-orangé', status: 'stable' },
  '0-3': { swatch: ['#7a5a45', WILD], label: 'Brun terne, sauvage', status: 'sauvage' },
  '0-4': { swatch: ['#6b4a73', '#7d6a5a'], label: 'Violacé ou brun terne', status: 'sauvage' },
  '0-5': { swatch: ['#8c1d18', WILD], label: 'Rouge foncé ou sauvage', status: 'variable' },
  '0-6': { swatch: ['#8a3a24'], label: 'Brun-rouge', status: 'stable' },
  '0-7': { swatch: ['#a05a3a', WILD], label: 'Brun-rouge, retour au sauvage', status: 'sauvage' },
  '1-2': { swatch: ['#f0a020'], label: 'Orange clair à jaune', status: 'stable' },
  '1-3': { swatch: ['#8a8a45', WILD], label: 'Brun-vert, souvent sauvage', status: 'variable' },
  '1-4': { swatch: ['#7a6a55', WILD], label: 'Brun ou sauvage', status: 'sauvage' },
  '1-5': { swatch: ['#a85518', '#4a3a2a'], label: 'Orange foncé ou brun', status: 'variable' },
  '1-6': { swatch: ['#9a5a26'], label: 'Brun-orangé', status: 'stable' },
  '1-7': { swatch: [WILD, '#b07a3a'], label: 'Surtout sauvage', status: 'sauvage' },
  '2-3': { swatch: ['#9fb540'], label: 'Vert à jaune-vert', status: 'stable' },
  '2-4': { swatch: ['#6fa060', '#8a9a6a'], label: 'Vert ou mélange terne', status: 'variable' },
  '2-5': { swatch: ['#b09a30', WILD], label: 'Jaune sale ou sauvage', status: 'variable' },
  '2-6': { swatch: ['#a58a45', WILD], label: 'Brun clair ou sauvage', status: 'variable' },
  '2-7': { swatch: [WILD, '#c4a840'], label: 'Surtout sauvage', status: 'sauvage' },
  '3-4': { swatch: ['#3f8a8a', WILD], label: 'Vert-bleu ou sauvage', status: 'variable' },
  '3-5': { swatch: ['#2f5a3a', WILD], label: 'Vert foncé ou sauvage', status: 'variable' },
  '3-6': { swatch: ['#5a6a3a'], label: 'Brun-vert', status: 'variable' },
  '3-7': { swatch: [WILD, '#5a8a50'], label: 'Surtout sauvage', status: 'sauvage' },
  '4-5': { swatch: ['#24407a', WILD], label: 'Bleu foncé ou sauvage', status: 'variable' },
  '4-6': { swatch: ['#5a4a4a', WILD], label: 'Brun ou sauvage', status: 'sauvage' },
  '4-7': { swatch: [WILD, '#4a6a9a'], label: 'Surtout sauvage', status: 'sauvage' },
  '5-6': { swatch: ['#2f241c'], label: 'Brun très foncé à noir', status: 'stable' },
  '5-7': { swatch: ['#4a463a', WILD], label: 'Sauvage foncé', status: 'sauvage' },
  '6-7': { swatch: ['#6a4e34', WILD], label: 'Brun ou sauvage', status: 'sauvage' },
};

export function crossOf(i: number, j: number): CrossResult {
  return CROSSES[i <= j ? `${i}-${j}` : `${j}-${i}`];
}

export const STATUS_INFO: Record<CrossStatus, { glyph: string; title: string; tip: string }> = {
  pur: { glyph: '◆', title: 'Lignée pure', tip: "Gardez les plus colorés pour maintenir l'intensité." },
  stable: { glyph: '●', title: 'Résultat prévisible', tip: 'Triez les juvéniles vers 1 mois pour fixer la teinte.' },
  variable: { glyph: '◐', title: 'Résultat variable', tip: 'Gardez les plus belles teintes et recroisez-les entre elles.' },
  sauvage: { glyph: '○', title: 'Dérive vers le sauvage', tip: 'À éviter pour des couleurs pures, tri strict dès la 2ᵉ génération.' },
};

/** Fond CSS d'une pastille : uni, ou coupé en diagonale pour deux couleurs. */
export function swatchBackground(swatch: string[]): string {
  return swatch.length === 1 ? swatch[0] : `linear-gradient(135deg, ${swatch[0]} 50%, ${swatch[1]} 50%)`;
}
