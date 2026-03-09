class TaskController {
  constructor(taskService) {
    this.taskService = taskService;
  }

  getTasks = async (req, res, next) => {
    try {
      const tasks = await this.taskService.getTasks();
      res.status(200).json(tasks);
    } catch (error) {
      next(error);
    }
  };

  getTaskById = async (req, res, next) => {
    try {
      const task = await this.taskService.getTaskById(req.params.id);
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  };

  createTask = async (req, res, next) => {
    try {
      const created = await this.taskService.createTask(req.body);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  };

  updateTask = async (req, res, next) => {
    try {
      const updated = await this.taskService.updateTask(req.params.id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };

  deleteTask = async (req, res, next) => {
    try {
      await this.taskService.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = TaskController;
