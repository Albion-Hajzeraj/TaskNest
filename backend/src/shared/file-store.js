const fs = require('fs/promises');
const path = require('path');

class FileStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '[]', 'utf8');
    }
  }

  async read() {
    await this.ensureFile();
    const content = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(content);
  }

  async write(data) {
    await this.ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

module.exports = FileStore;
