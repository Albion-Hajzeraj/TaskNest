class StatsController {
  constructor(statsService) {
    this.statsService = statsService;
  }

  getStats = async (req, res, next) => {
    try {
      const stats = await this.statsService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = StatsController;
