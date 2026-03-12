const { randomUUID } = require('crypto');

const { AppError } = require('../../shared/errors');

class TaskService {
  constructor(taskRepository, statsService) {
    this.taskRepository = taskRepository;
    this.statsService = statsService;
  }

  getAutoPriority(dueDate) {
    if (!dueDate) return 'low';
    const due = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) return 'low';

    const diffMs = due.getTime() - Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (diffMs <= dayMs) return 'high';
    if (diffMs <= 3 * dayMs) return 'medium';
    return 'low';
  }

  getNextDueDate(dueDate, repeat) {
    if (!dueDate || repeat === 'none') return '';
    const date = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    if (repeat === 'daily') date.setDate(date.getDate() + 1);
    if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  }

  cloneSubtasksForRecurring(subtasks) {
    if (!Array.isArray(subtasks) || subtasks.length === 0) return [];
    return subtasks.map((item) => ({
      id: randomUUID(),
      title: (item.title || '').trim(),
      checked: false
    })).filter((item) => item.title);
  }

  async createRecurringTaskFrom(baseTask) {
    if (!baseTask.repeat || baseTask.repeat === 'none' || !baseTask.dueDate) return null;
    const nextDueDate = this.getNextDueDate(baseTask.dueDate, baseTask.repeat);
    if (!nextDueDate) return null;

    const priority = baseTask.priorityMode === 'manual'
      ? (baseTask.priority || 'medium')
      : this.getAutoPriority(nextDueDate);

    const recurringTask = {
      id: randomUUID(),
      name: baseTask.name,
      checked: false,
      priority,
      priorityMode: baseTask.priorityMode === 'manual' ? 'manual' : 'auto',
      dueDate: nextDueDate,
      category: baseTask.category || 'General',
      notes: baseTask.notes || '',
      repeat: baseTask.repeat,
      status: 'todo',
      subtasks: this.cloneSubtasksForRecurring(baseTask.subtasks),
      timeSpentSeconds: 0,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    return this.taskRepository.create(recurringTask);
  }

  normalizeSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) return [];

    return subtasks.map((item) => ({
      id: item.id || randomUUID(),
      title: (item.title || '').trim(),
      checked: Boolean(item.checked)
    }));
  }

  areAllSubtasksComplete(subtasks) {
    return Array.isArray(subtasks) && subtasks.length > 0 && subtasks.every((item) => item.checked);
  }

  async getTasks() {
    return this.taskRepository.findAll();
  }

  async getTaskById(id) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new AppError('Task not found', 404);
    return task;
  }

  async createTask(payload) {
    this.validateTaskPayload(payload, true);

    const priorityMode = payload.priorityMode === 'manual' ? 'manual' : 'auto';
    const computedPriority = priorityMode === 'manual'
      ? (payload.priority || 'medium')
      : this.getAutoPriority(payload.dueDate);
    const normalizedSubtasks = this.normalizeSubtasks(payload.subtasks);
    const autoCompleted = this.areAllSubtasksComplete(normalizedSubtasks);
    const statusInput = payload.status || (payload.checked || autoCompleted ? 'done' : 'todo');
    const status = statusInput === 'done' ? 'done' : statusInput;
    const checked = status === 'done';

    const task = {
      id: randomUUID(),
      name: payload.name.trim(),
      checked,
      priority: computedPriority,
      priorityMode,
      dueDate: payload.dueDate || '',
      category: payload.category?.trim() || 'General',
      notes: payload.notes?.trim() || '',
      repeat: payload.repeat || 'none',
      status,
      subtasks: normalizedSubtasks,
      timeSpentSeconds: Number.isFinite(payload.timeSpentSeconds) && payload.timeSpentSeconds >= 0
        ? Math.floor(payload.timeSpentSeconds)
        : 0,
      createdAt: new Date().toISOString(),
      completedAt: checked ? new Date().toISOString() : null
    };

    return this.taskRepository.create(task);
  }

  async updateTask(id, payload) {
    this.validateTaskPayload(payload, false);

    const existing = await this.taskRepository.findById(id);
    if (!existing) throw new AppError('Task not found', 404);

    const wasChecked = existing.checked;
    const merged = {
      ...existing,
      ...payload
    };

    if (typeof merged.name === 'string') {
      merged.name = merged.name.trim();
    }
    if (typeof merged.category === 'string') {
      merged.category = merged.category.trim() || 'General';
    }
    if (typeof merged.notes === 'string') {
      merged.notes = merged.notes.trim();
    }
    if (merged.timeSpentSeconds === undefined || merged.timeSpentSeconds === null) {
      merged.timeSpentSeconds = 0;
    }
    if (typeof merged.timeSpentSeconds === 'number') {
      merged.timeSpentSeconds = Math.max(0, Math.floor(merged.timeSpentSeconds));
    }
    merged.priorityMode = merged.priorityMode === 'manual' ? 'manual' : 'auto';
    if (merged.priorityMode !== 'manual') {
      merged.priority = this.getAutoPriority(merged.dueDate);
    }
    merged.subtasks = this.normalizeSubtasks(merged.subtasks);

    if (payload.status) {
      merged.status = payload.status;
      merged.checked = merged.status === 'done';
    } else if (typeof payload.checked === 'boolean') {
      merged.checked = payload.checked;
      merged.status = merged.checked ? 'done' : (merged.status === 'done' ? 'todo' : merged.status || 'todo');
    } else if (!merged.status) {
      merged.status = merged.checked ? 'done' : 'todo';
    }

    if (this.areAllSubtasksComplete(merged.subtasks)) {
      merged.checked = true;
      merged.status = 'done';
      merged.completedAt = merged.completedAt || new Date().toISOString();
    } else if (merged.status !== 'done') {
      merged.completedAt = null;
    } else if (merged.checked) {
      merged.completedAt = merged.completedAt || new Date().toISOString();
    }

    this.validateTaskPayload(merged, true);
    const updated = await this.taskRepository.update(id, merged);

    const shouldCreateRecurring = !wasChecked
      && updated.checked
      && updated.repeat
      && updated.repeat !== 'none'
      && updated.dueDate;

    if (shouldCreateRecurring) {
      await this.createRecurringTaskFrom(updated);
    }

    if (!wasChecked && updated.checked) {
      const xp = this.getXpForTask(updated);
      if (this.statsService) {
        await this.statsService.addXp(xp);
      }
    }

    return updated;
  }

  async deleteTask(id) {
    const removed = await this.taskRepository.delete(id);
    if (!removed) throw new AppError('Task not found', 404);
  }

  validateTaskPayload(payload, requireName) {
    if (!payload || typeof payload !== 'object') {
      throw new AppError('Invalid payload', 400);
    }

    if (requireName && (!payload.name || typeof payload.name !== 'string' || !payload.name.trim())) {
      throw new AppError('Task name is required', 400);
    }

    if (payload.priority && !['high', 'medium', 'low'].includes(payload.priority)) {
      throw new AppError('Invalid priority value', 400);
    }

    if (payload.priorityMode && !['auto', 'manual'].includes(payload.priorityMode)) {
      throw new AppError('Invalid priorityMode value', 400);
    }

    if (payload.status && !['todo', 'in-progress', 'done'].includes(payload.status)) {
      throw new AppError('Invalid status value', 400);
    }

    if (payload.repeat && !['none', 'daily', 'weekly', 'monthly'].includes(payload.repeat)) {
      throw new AppError('Invalid repeat value', 400);
    }

    if (payload.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) {
      throw new AppError('Invalid dueDate format (expected YYYY-MM-DD)', 400);
    }

    if (payload.timeSpentSeconds !== undefined) {
      if (typeof payload.timeSpentSeconds !== 'number' || Number.isNaN(payload.timeSpentSeconds)) {
        throw new AppError('Invalid timeSpentSeconds value', 400);
      }
      if (payload.timeSpentSeconds < 0) {
        throw new AppError('timeSpentSeconds cannot be negative', 400);
      }
    }

    if (payload.subtasks) {
      if (!Array.isArray(payload.subtasks)) {
        throw new AppError('Invalid subtasks value', 400);
      }

      for (const subtask of payload.subtasks) {
        if (!subtask || typeof subtask !== 'object') {
          throw new AppError('Invalid subtask value', 400);
        }

        if (typeof subtask.title !== 'string' || !subtask.title.trim()) {
          throw new AppError('Invalid subtask title', 400);
        }

        if (subtask.id && typeof subtask.id !== 'string') {
          throw new AppError('Invalid subtask id', 400);
        }

        if (subtask.checked !== undefined && typeof subtask.checked !== 'boolean') {
          throw new AppError('Invalid subtask checked flag', 400);
        }
      }
    }
  }

  getXpForTask(task) {
    const priority = task.priority || 'medium';
    if (priority === 'high') return 50;
    if (priority === 'low') return 15;
    return 30;
  }
}

module.exports = TaskService;
