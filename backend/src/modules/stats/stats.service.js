class StatsService {
  constructor(statsRepository) {
    this.statsRepository = statsRepository;
    this.thresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
  }

  getThresholdForLevel(level) {
    if (level <= this.thresholds.length) {
      return this.thresholds[level - 1];
    }
    const extraLevels = level - this.thresholds.length;
    const last = this.thresholds[this.thresholds.length - 1];
    return last + extraLevels * 600;
  }

  computeLevel(xp) {
    let level = 1;
    while (xp >= this.getThresholdForLevel(level + 1)) {
      level += 1;
    }
    return level;
  }

  buildResponse(stats) {
    const xp = stats.xp;
    const level = this.computeLevel(xp);
    const currentLevelXp = this.getThresholdForLevel(level);
    const nextLevelXp = this.getThresholdForLevel(level + 1);
    const progress = Math.min(100, Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));
    return {
      xp,
      level,
      currentLevelXp,
      nextLevelXp,
      progress
    };
  }

  async getStats() {
    const stats = await this.statsRepository.read();
    const normalized = {
      xp: Math.max(0, Math.floor(stats.xp || 0)),
      level: Math.max(1, Math.floor(stats.level || 1))
    };
    return this.buildResponse(normalized);
  }

  async addXp(amount) {
    const delta = Math.max(0, Math.floor(amount || 0));
    const stats = await this.statsRepository.read();
    const xp = Math.max(0, Math.floor(stats.xp || 0)) + delta;
    const level = this.computeLevel(xp);
    const updated = { xp, level };
    await this.statsRepository.write(updated);
    return this.buildResponse(updated);
  }
}

module.exports = StatsService;
