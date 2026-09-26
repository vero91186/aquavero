import type { MaintenanceLog, MaintenanceTaskType } from '@/types/database';

export interface ReminderStatus {
  taskType: MaintenanceTaskType;
  dueAt: Date;
  daysLeft: number;
  level: 'soon' | 'overdue';
}

// Pour chaque type d'intervention, on ne regarde que le dernier journal
// enregistré qui portait un rappel programmé (next_due_at) — un nouveau
// passage du même type remplace automatiquement le rappel précédent.
// On ne remonte que les rappels dans les 3 prochains jours ou déjà en retard,
// pour ne pas noyer l'aperçu avec des échéances lointaines.
export function computeReminders(logs: MaintenanceLog[]): ReminderStatus[] {
  const latestByType = new Map<MaintenanceTaskType, MaintenanceLog>();
  for (const log of logs) {
    if (!log.next_due_at) continue;
    const current = latestByType.get(log.task_type);
    if (!current || new Date(log.performed_at).getTime() > new Date(current.performed_at).getTime()) {
      latestByType.set(log.task_type, log);
    }
  }

  const now = Date.now();
  const results: ReminderStatus[] = [];
  for (const log of latestByType.values()) {
    const dueAt = new Date(log.next_due_at as string);
    const daysLeft = Math.ceil((dueAt.getTime() - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      results.push({ taskType: log.task_type, dueAt, daysLeft, level: daysLeft < 0 ? 'overdue' : 'soon' });
    }
  }
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}
