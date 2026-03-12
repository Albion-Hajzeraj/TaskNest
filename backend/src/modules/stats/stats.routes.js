const express = require('express');

const StatsController = require('./stats.controller');
const StatsRepository = require('./stats.repository');
const StatsService = require('./stats.service');

const statsRepository = new StatsRepository();
const statsService = new StatsService(statsRepository);
const statsController = new StatsController(statsService);

const router = express.Router();

router.get('/', statsController.getStats);

module.exports = router;
