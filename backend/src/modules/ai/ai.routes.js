const express = require('express');

const AiController = require('./ai.controller');
const AiService = require('./ai.service');

const aiService = new AiService();
const aiController = new AiController(aiService);

const router = express.Router();

router.post('/subtasks', aiController.generateSubtasks);

module.exports = router;
