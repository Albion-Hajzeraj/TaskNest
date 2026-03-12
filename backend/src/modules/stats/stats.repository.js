const path = require('path');

const FileStore = require('../../shared/file-store');

class StatsRepository {
  constructor() {
    const filePath = path.resolve(__dirname, '../../../data/stats.json');
    this.store = new FileStore(filePath);
  }

  async read() {
    const data = await this.store.read();
    if (!data || Array.isArray(data)) {
      return { xp: 0, level: 1 };
    }
    return {
      xp: Number.isFinite(data.xp) ? data.xp : 0,
      level: Number.isFinite(data.level) ? data.level : 1
    };
  }

  async write(payload) {
    return this.store.write(payload);
  }
}

module.exports = StatsRepository;
