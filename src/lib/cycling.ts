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
