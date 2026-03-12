class AiController {
  constructor(aiService) {
    this.aiService = aiService;
  }

  generateSubtasks = async (req, res, next) => {
    try {
      const { task } = req.body || {};
      const result = await this.aiService.generateSubtasks(task);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = AiController;
