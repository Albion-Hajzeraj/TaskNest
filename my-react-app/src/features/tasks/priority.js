export const getAutoPriority = (dueDate, now = new Date()) => {
  if (!dueDate) return 'low';
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 'low';

  const diffMs = due.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (diffMs <= dayMs) return 'high';
  if (diffMs <= 3 * dayMs) return 'medium';
  return 'low';
};

export const getEffectivePriority = (task, now = new Date()) => {
  if (task?.priorityMode === 'manual') {
    return task?.priority || 'medium';
  }
  return getAutoPriority(task?.dueDate, now);
};
