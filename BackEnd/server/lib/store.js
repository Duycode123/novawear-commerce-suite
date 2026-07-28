const fs = require("fs");
const path = require("path");
const { createSeedData } = require("../data/seed");

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      this.data = createSeedData();
      this.save();
      return;
    }

    try {
      this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      throw new Error(`Không thể đọc kho dữ liệu tại ${this.filePath}: ${error.message}`);
    }
  }

  save() {
    this.data.meta = {
      ...(this.data.meta || {}),
      updatedAt: new Date().toISOString(),
    };
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  reset() {
    this.data = createSeedData();
    this.save();
    return this.data;
  }

  nextId(collectionName, prefix) {
    const collection = this.data[collectionName] || [];
    const max = collection.reduce((current, item) => {
      const match = String(item.id || "").match(/(\d+)$/);
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, "0")}`;
  }

  audit(action, entity, entityId, actor) {
    this.data.auditLogs = this.data.auditLogs || [];
    this.data.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      entity,
      entityId,
      actorId: actor?.id || null,
      actorName: actor?.name || "Hệ thống",
      at: new Date().toISOString(),
    });
    this.data.auditLogs = this.data.auditLogs.slice(0, 500);
  }
}

module.exports = { JsonStore };
