const path = require('path');

const FileStore = require('../../shared/file-store');

class TaskRepository {
  constructor() {
    const filePath = path.resolve(__dirname, '../../../data/tasks.json');
    this.store = new FileStore(filePath);
  }

  async findAll() {
    return this.store.read();
  }

  async findById(id) {
    const tasks = await this.store.read();
    return tasks.find((task) => task.id === id) || null;
  }

  async create(task) {
    const tasks = await this.store.read();
    tasks.push(task);
    await this.store.write(tasks);
    return task;
  }

  async update(id, partial) {
    const tasks = await this.store.read();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    tasks[index] = { ...tasks[index], ...partial };
    await this.store.write(tasks);
    return tasks[index];
  }

  async delete(id) {
    const tasks = await this.store.read();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) return false;

    tasks.splice(index, 1);
    await this.store.write(tasks);
    return true;
  }
}

module.exports = TaskRepository;
