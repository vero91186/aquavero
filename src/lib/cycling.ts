import type { CyclingDose, CyclingStatus, WaterTest } from '@/types/database';

// Suggestion de statut de cyclage à partir de l'historique des tests d'eau,
// suivant la logique classique du cycle de l'azote : le cycle est considéré
// bouclé quand l'ammoniac ET les nitrites reviennent à 0 alors que des
// nitrates sont détectés (signe que les bactéries nitrifiantes se sont
// installées). Reste une suggestion : le statut réel est toujours choisi par
// l'utilisateur, jamais forcé automatiquement.

export interface CyclingSuggestion {
  suggestion: CyclingStatus;
  label: string;
  explanation: string;
}

const NEAR_ZERO = 0.25;

export function suggestCyclingStatus(
  tests: WaterTest[],
  doses: CyclingDose[]
): CyclingSuggestion {
  if (tests.length === 0 && doses.length === 0) {
    return {
      suggestion: 'not_started',
      label: 'Pas encore démarré',
      explanation: "Aucun test ni apport d'ammoniac enregistré pour l'instant.",
    };
  }

  const sorted = [...tests].sort(
    (a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime()
  );
  const latest = sorted[0];

  if (!latest) {
    return {
      suggestion: 'cycling',
      label: 'Cyclage en cours',
      explanation: "Des apports d'ammoniac sont enregistrés mais aucun test d'eau pour l'instant — pense à tester régulièrement.",
    };
  }

  const ammonia = latest.ammonia_ppm;
  const nitrite = latest.nitrite_ppm;
  const nitrate = latest.nitrate_ppm;

  const ammoniaOk = ammonia !== null && ammonia <= NEAR_ZERO;
  const nitriteOk = nitrite !== null && nitrite <= NEAR_ZERO;
  const nitrateShowsUp = nitrate !== null && nitrate > 0;

  if (ammoniaOk && nitriteOk && nitrateShowsUp) {
    return {
      suggestion: 'cycled',
      label: 'Cycle terminé',
      explanation: `Dernier test : ammoniac ${ammonia} et nitrites ${nitrite} proches de 0, nitrates à ${nitrate} — les bactéries nitrifiantes semblent installées.`,
    };
  }

  if (ammonia !== null && nitrite !== null) {
    return {
      suggestion: 'cycling',
      label: 'Cyclage en cours',
      explanation: `Dernier test : ammoniac ${ammonia}, nitrites ${nitrite}${nitrate !== null ? `, nitrates ${nitrate}` : ''} — pas encore stabilisé à 0/0 avec des nitrates présents.`,
    };
  }

  return {
    suggestion: 'cycling',
    label: 'Cyclage en cours',
    explanation: 'Renseigne ammoniac et nitrites dans tes tests pour suivre la progression du cycle.',
  };
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const start = new Date(dateStr);
  const diffMs = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

// Étape du cycle de l'azote pour l'affichage type "stepper" (Démarrer →
// Ammoniac → Nitrite → Prêt), à partir du statut choisi par l'utilisateur et
// du dernier test d'eau.
export type CycleStage = 'start' | 'ammonia' | 'nitrite' | 'ready';

export const CYCLE_STAGE_LABELS: Record<CycleStage, string> = {
  start: 'Démarrer',
  ammonia: 'Ammoniac',
  nitrite: 'Nitrite',
  ready: 'Prêt',
};

export const CYCLE_STAGE_MESSAGES: Record<CycleStage, string> = {
  start: "Rien ne s'enregistre encore — ajoute une source d'ammoniac (une pincée de nourriture ou de l'ammoniac pur) et teste tous les deux jours.",
  ammonia: "L'ammoniac est présent — les bactéries qui le transforment en nitrites sont en train de s'installer. Continue de tester régulièrement.",
  nitrite: "L'ammoniac redescend, les nitrites apparaissent — la deuxième famille de bactéries s'installe. Patiente jusqu'à ce qu'ils reviennent à 0.",
  ready: 'Ammoniac et nitrites à 0 avec des nitrates présents : le cycle est établi.',
};

// Guide détaillé des étapes du cycle de l'azote (fishless cycling), affiché
// en complément du stepper compact — pour que l'utilisateur comprenne quoi
// faire concrètement à chaque étape, pas seulement où il en est.
export interface CycleGuideStep {
  key: CycleStage;
  title: string;
  description: string;
}

export const CYCLE_GUIDE_STEPS: CycleGuideStep[] = [
  {
    key: 'start',
    title: 'Démarrer le cycle',
    description:
      "Bac en eau, décor et substrat en place, sans poisson. Ajoute une source d'ammoniac (nourriture qui pourrit ou ammoniac pur sans additif) pour atteindre environ 2 à 4 ppm, et teste l'eau tous les 2 jours.",
  },
  {
    key: 'ammonia',
    title: "Pic d'ammoniac",
    description:
      "L'ammoniac monte puis commence à redescendre entre deux apports : les premières bactéries (Nitrosomonas) s'installent et le transforment en nitrites. Continue les apports réguliers et les tests.",
  },
  {
    key: 'nitrite',
    title: 'Pic de nitrites',
    description:
      "L'ammoniac est désormais transformé rapidement, mais les nitrites — toxiques eux aussi — montent en attendant l'installation de la deuxième famille de bactéries (Nitrobacter). Continue à tester, la patience est normale ici.",
  },
  {
    key: 'ready',
    title: 'Cycle terminé',
    description:
      "Ammoniac et nitrites reviennent à 0 en moins de 24 h après un apport, et des nitrates apparaissent. Fais un grand changement d'eau (environ 50 %) pour faire baisser les nitrates, puis introduis les premiers poissons progressivement.",
  },
];

export function getCycleStage(status: CyclingStatus, latestTest: WaterTest | null): CycleStage {
  if (status === 'cycled') return 'ready';
  if (!latestTest) return 'start';

  const ammonia = latestTest.ammonia_ppm;
  const nitrite = latestTest.nitrite_ppm;
  const nitrate = latestTest.nitrate_ppm;

  if (ammonia !== null && ammonia > NEAR_ZERO) return 'ammonia';
  if (nitrite !== null && nitrite > NEAR_ZERO) return 'nitrite';
  if (
    ammonia !== null &&
    nitrite !== null &&
    ammonia <= NEAR_ZERO &&
    nitrite <= NEAR_ZERO &&
    nitrate !== null &&
    nitrate > 0
  ) {
    return 'ready';
  }
  return 'start';
}

// ---------------------------------------------------------------------------
// Rodage précis : repères de durée, critères de fin vérifiables, niveaux par
// paramètre, tendance et actions concrètes à partir des vrais tests.
// ---------------------------------------------------------------------------

export const NEAR_ZERO_PPM = NEAR_ZERO;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Durées typiques d'un rodage sans poisson (4 à 6 semaines). Ce sont des
// repères : un bac planté ou ensemencé en bactéries peut aller plus vite.
export const CYCLE_PHASES: { key: CycleStage; label: string; from: number; to: number; color: string }[] = [
  { key: 'start', label: 'Démarrage', from: 0, to: 7, color: '#b6c5be' },
  { key: 'ammonia', label: 'Pic d’ammoniac', from: 7, to: 21, color: '#e0a23a' },
  { key: 'nitrite', label: 'Pic de nitrites', from: 21, to: 35, color: '#d9734a' },
  { key: 'ready', label: 'Stabilisation', from: 35, to: 42, color: '#3b8056' },
];
export const CYCLE_TYPICAL_DAYS = 42;

export function sortedTests(tests: WaterTest[]): WaterTest[] {
  return [...tests].sort((a, b) => new Date(b.tested_at).getTime() - new Date(a.tested_at).getTime());
}

export type ParamLevel = 'ok' | 'progress' | 'high' | 'unknown';
export type ParamKey = 'ammonia' | 'nitrite' | 'nitrate';
export type Trend = 'down' | 'up' | 'flat' | null;

export interface ParamReading {
  key: ParamKey;
  label: string;
  value: number | null;
  previous: number | null;
  trend: Trend;
  level: ParamLevel;
  max: number; // fin d'échelle de la jauge
  caption: string;
}

function trendOf(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null) return null;
  const d = current - previous;
  if (Math.abs(d) < 0.1) return 'flat';
  return d < 0 ? 'down' : 'up';
}

export function readParams(tests: WaterTest[]): ParamReading[] {
  const [latest, prev] = sortedTests(tests);
  const get = (t: WaterTest | undefined, k: 'ammonia_ppm' | 'nitrite_ppm' | 'nitrate_ppm') => (t ? t[k] : null);

  const nh3 = get(latest, 'ammonia_ppm');
  const no2 = get(latest, 'nitrite_ppm');
  const no3 = get(latest, 'nitrate_ppm');

  const level = (v: number | null, high: number): ParamLevel =>
    v === null ? 'unknown' : v <= NEAR_ZERO ? 'ok' : v > high ? 'high' : 'progress';

  return [
    {
      key: 'ammonia',
      label: 'Ammoniac',
      value: nh3,
      previous: get(prev, 'ammonia_ppm'),
      trend: trendOf(nh3, get(prev, 'ammonia_ppm')),
      level: level(nh3, 4),
      max: 5,
      caption: 'à 0 en fin de rodage',
    },
    {
      key: 'nitrite',
      label: 'Nitrites',
      value: no2,
      previous: get(prev, 'nitrite_ppm'),
      trend: trendOf(no2, get(prev, 'nitrite_ppm')),
      level: level(no2, 5),
      max: 5,
      caption: 'à 0 en fin de rodage',
    },
    {
      key: 'nitrate',
      label: 'Nitrates',
      value: no3,
      previous: get(prev, 'nitrate_ppm'),
      trend: trendOf(no3, get(prev, 'nitrate_ppm')),
      level: no3 === null ? 'unknown' : no3 > 40 ? 'high' : no3 > 0 ? 'ok' : 'progress',
      max: 50,
      caption: 'doivent apparaître, sous 25 ensuite',
    },
  ];
}

export interface Criterion {
  id: string;
  label: string;
  state: 'done' | 'todo' | 'unknown';
  detail: string;
}

export function cycleCriteria(tests: WaterTest[], doses: CyclingDose[]): Criterion[] {
  const sorted = sortedTests(tests);
  const latest = sorted[0];
  const out: Criterion[] = [];

  const state = (v: number | null | undefined, ok: boolean): Criterion['state'] =>
    v === null || v === undefined ? 'unknown' : ok ? 'done' : 'todo';

  out.push({
    id: 'nh3',
    label: 'Ammoniac à 0 (0,25 ppm ou moins)',
    state: state(latest?.ammonia_ppm, (latest?.ammonia_ppm ?? 1) <= NEAR_ZERO),
    detail: latest?.ammonia_ppm != null ? `Dernier test : ${latest.ammonia_ppm} ppm` : 'Pas de valeur',
  });
  out.push({
    id: 'no2',
    label: 'Nitrites à 0 (0,25 ppm ou moins)',
    state: state(latest?.nitrite_ppm, (latest?.nitrite_ppm ?? 1) <= NEAR_ZERO),
    detail: latest?.nitrite_ppm != null ? `Dernier test : ${latest.nitrite_ppm} ppm` : 'Pas de valeur',
  });
  out.push({
    id: 'no3',
    label: 'Nitrates présents',
    state: state(latest?.nitrate_ppm, (latest?.nitrate_ppm ?? 0) > 0),
    detail: latest?.nitrate_ppm != null ? `Dernier test : ${latest.nitrate_ppm} ppm` : 'Pas de valeur',
  });

  // Stabilité : les deux derniers tests complets sont tous deux à 0/0.
  const complete = sorted.filter((t) => t.ammonia_ppm !== null && t.nitrite_ppm !== null);
  if (complete.length >= 2) {
    const stable = complete.slice(0, 2).every((t) => t.ammonia_ppm! <= NEAR_ZERO && t.nitrite_ppm! <= NEAR_ZERO);
    out.push({
      id: 'stable',
      label: 'Stable sur deux tests de suite',
      state: stable ? 'done' : 'todo',
      detail: stable ? 'Les deux derniers tests sont propres' : 'Un des deux derniers tests montre encore de l’ammoniac ou des nitrites',
    });
  } else {
    out.push({
      id: 'stable',
      label: 'Stable sur deux tests de suite',
      state: 'unknown',
      detail: 'Il faut au moins deux tests avec ammoniac et nitrites',
    });
  }

  // Épreuve des 24 h : après le dernier apport d'ammoniac, tout doit être
  // consommé en une journée.
  if (doses.length > 0) {
    const lastDose = [...doses].sort((a, b) => new Date(b.dosed_at).getTime() - new Date(a.dosed_at).getTime())[0];
    const doseTime = new Date(lastDose.dosed_at).getTime();
    const after = sorted.filter((t) => new Date(t.tested_at).getTime() >= doseTime + 20 * HOUR);
    const t24 = after.length > 0 ? after[after.length - 1] : null; // premier test après ~24 h
    if (t24 && t24.ammonia_ppm !== null && t24.nitrite_ppm !== null) {
      const ok = t24.ammonia_ppm <= NEAR_ZERO && t24.nitrite_ppm <= NEAR_ZERO;
      out.push({
        id: 'epreuve24',
        label: 'Apport d’ammoniac consommé en 24 h',
        state: ok ? 'done' : 'todo',
        detail: ok ? 'Ammoniac et nitrites à 0 un jour après le dernier apport' : 'Il restait de l’ammoniac ou des nitrites après le dernier apport',
      });
    } else {
      out.push({
        id: 'epreuve24',
        label: 'Apport d’ammoniac consommé en 24 h',
        state: 'unknown',
        detail: 'Teste l’eau environ 24 h après le prochain apport',
      });
    }
  }
  return out;
}

export function criteriaMet(criteria: Criterion[]): boolean {
  return criteria.length > 0 && criteria.every((c) => c.state === 'done' || (c.id === 'epreuve24' && c.state === 'unknown'));
}

export interface CycleAction {
  tone: 'alert' | 'info' | 'success';
  text: string;
}

export function nextActions(tank: { cycling_status: CyclingStatus; is_planted: boolean }, tests: WaterTest[], doses: CyclingDose[]): CycleAction[] {
  const sorted = sortedTests(tests);
  const latest = sorted[0];
  const actions: CycleAction[] = [];

  if (!latest) {
    actions.push({ tone: 'info', text: 'Fais un premier test d’ammoniac, de nitrites et de nitrates pour situer le bac.' });
    return actions;
  }

  const ageDays = (Date.now() - new Date(latest.tested_at).getTime()) / DAY;
  if (tank.cycling_status !== 'cycled' && ageDays > 3) {
    actions.push({ tone: 'alert', text: `Le dernier test date de ${Math.floor(ageDays)} jours : refais-en un, il faut tester tous les 2 jours pendant le rodage.` });
  }
  if ((latest.ammonia_ppm ?? 0) > 4) {
    actions.push({ tone: 'alert', text: 'Ammoniac au-dessus de 4 ppm : change environ la moitié de l’eau, un excès freine les bactéries.' });
  }
  if ((latest.nitrite_ppm ?? 0) > 5) {
    actions.push({ tone: 'alert', text: 'Nitrites au-dessus de 5 ppm : change environ la moitié de l’eau, ils bloquent la deuxième famille de bactéries.' });
  }
  if (latest.temperature_c !== null && latest.temperature_c < 22) {
    actions.push({ tone: 'info', text: `Eau à ${latest.temperature_c} °C : les bactéries travaillent mal sous 22 °C, vise 25 à 28 °C pendant le rodage.` });
  }
  if (latest.ph !== null && latest.ph < 6.5) {
    actions.push({ tone: 'info', text: `pH à ${latest.ph} : sous 6,5 le rodage se bloque, vérifie le KH.` });
  }
  if (latest.kh_dkh !== null && latest.kh_dkh < 2) {
    actions.push({ tone: 'info', text: `KH à ${latest.kh_dkh} °dKH : trop bas, les bactéries consomment le KH et le pH peut s’effondrer.` });
  }

  const criteria = cycleCriteria(tests, doses);
  if (criteriaMet(criteria) && tank.cycling_status !== 'cycled') {
    actions.push({ tone: 'success', text: 'Tous les critères sont remplis : marque le rodage comme terminé, change environ 50 % de l’eau et introduis les animaux par vagues.' });
  } else if (tank.cycling_status === 'cycled') {
    actions.push({ tone: 'success', text: 'Rodage terminé : introduis les animaux par vagues et surveille les nitrites après chaque ajout.' });
  } else {
    const stage = getCycleStage(tank.cycling_status, latest);
    if (stage === 'ammonia') actions.push({ tone: 'info', text: 'Phase d’ammoniac : patiente, ne change pas l’eau tant que l’ammoniac reste sous 4 ppm.' });
    if (stage === 'nitrite') actions.push({ tone: 'info', text: 'Phase de nitrites : c’est la plus longue, continue les tests sans rien ajouter.' });
    if (stage === 'start') actions.push({ tone: 'info', text: 'Pas encore d’ammoniac mesuré : apporte une source d’ammoniac, ou vérifie que ton test fonctionne.' });
  }
  if (tank.is_planted && tank.cycling_status !== 'cycled') {
    actions.push({ tone: 'info', text: 'Bac planté : les plantes absorbent une partie de l’ammoniac, les pics sont plus faibles et plus courts, c’est normal.' });
  }
  return actions;
}
