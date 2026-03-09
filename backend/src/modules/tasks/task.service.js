const { randomUUID } = require('crypto');

const { AppError } = require('../../shared/errors');

class TaskService {
  constructor(taskRepository) {
    this.taskRepository = taskRepository;
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

    const task = {
      id: randomUUID(),
      name: payload.name.trim(),
      checked: Boolean(payload.checked),
      priority: payload.priority || 'medium',
      dueDate: payload.dueDate || '',
      category: payload.category?.trim() || 'General',
      notes: payload.notes?.trim() || '',
      repeat: payload.repeat || 'none',
      createdAt: new Date().toISOString(),
      completedAt: payload.checked ? new Date().toISOString() : null
    };

    return this.taskRepository.create(task);
  }

  async updateTask(id, payload) {
    this.validateTaskPayload(payload, false);

    const existing = await this.taskRepository.findById(id);
    if (!existing) throw new AppError('Task not found', 404);

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
    if (typeof merged.checked === 'boolean') {
      merged.completedAt = merged.checked ? (existing.completedAt || new Date().toISOString()) : null;
    }

    this.validateTaskPayload(merged, true);
    return this.taskRepository.update(id, merged);
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

    if (payload.repeat && !['none', 'daily', 'weekly', 'monthly'].includes(payload.repeat)) {
      throw new AppError('Invalid repeat value', 400);
    }

    if (payload.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) {
      throw new AppError('Invalid dueDate format (expected YYYY-MM-DD)', 400);
    }
  }
}

module.exports = TaskService;
