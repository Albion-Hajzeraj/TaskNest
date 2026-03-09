const express = require('express');

const TaskController = require('./task.controller');
const TaskRepository = require('./task.repository');
const TaskService = require('./task.service');

const taskRepository = new TaskRepository();
const taskService = new TaskService(taskRepository);
const taskController = new TaskController(taskService);

const router = express.Router();

router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
