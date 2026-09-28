import type { MaintenanceTaskType } from '@/types/database';

export const TASK_LABELS: Record<MaintenanceTaskType, string> = {
  water_change: "Changement d'eau",
  filter_clean: 'Nettoyage filtre',
  glass_clean: 'Nettoyage vitres',
  dosing: 'Dosage / engrais',
  feeding: 'Alimentation',
  equipment_check: 'Vérification matériel',
  observation: 'Observation',
  other: 'Autre',
};

// Fréquence par défaut suggérée pour programmer un rappel, en jours, quand
// l'utilisateur sélectionne ce type d'intervention. null = pas de suggestion
// (l'utilisateur saisit librement s'il le souhaite).
export const DEFAULT_REMINDER_DAYS: Record<MaintenanceTaskType, number | null> = {
  water_change: 7,
  filter_clean: 30,
  glass_clean: 14,
  dosing: 7,
  feeding: null,
  equipment_check: 30,
  observation: null,
  other: null,
};
