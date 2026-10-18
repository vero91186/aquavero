import type { MaintenanceLog, MaintenanceTaskType } from '@/types/database';

export interface ReminderStatus {
  taskType: MaintenanceTaskType;
  dueAt: Date;
  daysLeft: number;
  level: 'soon' | 'overdue';
}

// Pour chaque type d'intervention, seul le dernier passage enregistré compte : s'il porte un
// rappel programmé (next_due_at), c'est lui qui s'affiche ; s'il n'en porte pas (une case cochée
// dans le planning, une intervention notée sans rappel), il remplace l'ancien rappel, puisque la
// tâche vient d'être faite. Exception pour « dosage » et « autre », qui regroupent des tâches
// différentes (engrais, catappa, pastilles, taille) : un passage sans rappel ne doit pas effacer
// le rappel d'une autre tâche du même type, on ne regarde donc que les passages avec rappel.
// On ne remonte que les rappels dans les 3 prochains jours ou déjà en retard,
// pour ne pas noyer l'aperçu avec des échéances lointaines.
const SHARED_TYPES = new Set<MaintenanceTaskType>(['dosing', 'other']);

export function computeReminders(logs: MaintenanceLog[]): ReminderStatus[] {
  const latestByType = new Map<MaintenanceTaskType, MaintenanceLog>();
  for (const log of logs) {
    if (!log.next_due_at && SHARED_TYPES.has(log.task_type)) continue;
    const current = latestByType.get(log.task_type);
    if (!current || new Date(log.performed_at).getTime() > new Date(current.performed_at).getTime()) {
      latestByType.set(log.task_type, log);
    }
  }

  const now = Date.now();
  const results: ReminderStatus[] = [];
  for (const log of latestByType.values()) {
    if (!log.next_due_at) continue;
    const dueAt = new Date(log.next_due_at as string);
    const daysLeft = Math.ceil((dueAt.getTime() - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      results.push({ taskType: log.task_type, dueAt, daysLeft, level: daysLeft < 0 ? 'overdue' : 'soon' });
    }
  }
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}
