class BaseService {
  constructor(model) {
    this.model = model;
    this.logger = require('../utils/logger');
  }

  async create(data) {
    try {
      const result = await this.model.create(data);
      this.logger.info(`Created new ${this.model.name}`, result);
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.model.name}`, error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const result = await this.model.findById(id);
      if (!result) {
        throw new Error(`${this.model.name} not found`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Error finding ${this.model.name}`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const result = await this.model.findByIdAndUpdate(id, data, { new: true });
      if (!result) {
        throw new Error(`${this.model.name} not found`);
      }
      this.logger.info(`Updated ${this.model.name}`, result);
      return result;
    } catch (error) {
      this.logger.error(`Error updating ${this.model.name}`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.model.findByIdAndDelete(id);
      if (!result) {
        throw new Error(`${this.model.name} not found`);
      }
      this.logger.info(`Deleted ${this.model.name}`, result);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting ${this.model.name}`, error);
      throw error;
    }
  }

  async list(query = {}) {
    try {
      return await this.model.find(query);
    } catch (error) {
      this.logger.error(`Error listing ${this.model.name}`, error);
      throw error;
    }
  }
}

module.exports = BaseService;
