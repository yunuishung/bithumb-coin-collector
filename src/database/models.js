const { getConnection } = require('../config/database');

class PriceDataModel {
  static async insert(data) {
    const connection = await getConnection();
    try {
      const query = `
        INSERT INTO price_data (
          symbol, opening_price, closing_price, min_price, max_price,
          units_traded, acc_trade_value, prev_closing_price,
          units_traded_24h, acc_trade_value_24h, fluctate_24h, fluctate_rate_24h
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        data.symbol,
        data.opening_price || null,
        data.closing_price || null,
        data.min_price || null,
        data.max_price || null,
        data.units_traded || null,
        data.acc_trade_value || null,
        data.prev_closing_price || null,
        data.units_traded_24H || null,
        data.acc_trade_value_24H || null,
        data.fluctate_24H || null,
        data.fluctate_rate_24H || null
      ];

      const [result] = await connection.execute(query, values);
      return result;
    } finally {
      connection.release();
    }
  }

  static async getLatest(symbol, limit = 10) {
    const connection = await getConnection();
    try {
      const limitValue = parseInt(limit) || 10;
      const query = `
        SELECT * FROM price_data 
        WHERE symbol = ? 
        ORDER BY collected_at DESC 
        LIMIT ${limitValue}
      `;
      const [rows] = await connection.execute(query, [symbol]);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getByTimeRange(symbol, startTime, endTime) {
    const connection = await getConnection();
    try {
      const query = `
        SELECT * FROM price_data 
        WHERE symbol = ? AND collected_at BETWEEN ? AND ?
        ORDER BY collected_at DESC
      `;
      const [rows] = await connection.execute(query, [symbol, startTime, endTime]);
      return rows;
    } finally {
      connection.release();
    }
  }
}

class CollectionLogModel {
  static async insert(logData) {
    const connection = await getConnection();
    try {
      const query = `
        INSERT INTO collection_logs (symbol, status, message, error_details, execution_time)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const values = [
        logData.symbol,
        logData.status,
        logData.message,
        logData.error_details ? JSON.stringify(logData.error_details) : null,
        logData.execution_time || null
      ];

      const [result] = await connection.execute(query, values);
      return result;
    } finally {
      connection.release();
    }
  }

  static async getRecentLogs(limit = 100) {
    const connection = await getConnection();
    try {
      const limitValue = parseInt(limit) || 100;
      const query = `
        SELECT * FROM collection_logs 
        ORDER BY collected_at DESC 
        LIMIT ${limitValue}
      `;
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getErrorLogs(symbol = null, limit = 50) {
    const connection = await getConnection();
    try {
      const limitValue = parseInt(limit) || 50;
      let query = `
        SELECT * FROM collection_logs 
        WHERE status = 'error'
      `;
      let values = [];
      
      if (symbol) {
        query += ' AND symbol = ?';
        values.push(symbol);
      }
      
      query += ` ORDER BY collected_at DESC LIMIT ${limitValue}`;

      const [rows] = await connection.execute(query, values);
      return rows;
    } finally {
      connection.release();
    }
  }
}

class SystemConfigModel {
  static async get(key) {
    const connection = await getConnection();
    try {
      const query = 'SELECT config_value FROM system_config WHERE config_key = ?';
      const [rows] = await connection.execute(query, [key]);
      return rows.length > 0 ? rows[0].config_value : null;
    } finally {
      connection.release();
    }
  }

  static async set(key, value, description = null) {
    const connection = await getConnection();
    try {
      const query = `
        INSERT INTO system_config (config_key, config_value, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        config_value = VALUES(config_value),
        description = COALESCE(VALUES(description), description),
        updated_at = CURRENT_TIMESTAMP
      `;
      const [result] = await connection.execute(query, [key, value, description]);
      return result;
    } finally {
      connection.release();
    }
  }

  static async getAll() {
    const connection = await getConnection();
    try {
      const query = 'SELECT * FROM system_config ORDER BY config_key';
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      connection.release();
    }
  }
}

class CoinsModel {
  static async getAll() {
    const connection = await getConnection();
    try {
      const query = 'SELECT * FROM coins ORDER BY symbol';
      const [rows] = await connection.execute(query);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async addCoin(symbol, name) {
    const connection = await getConnection();
    try {
      const query = 'INSERT IGNORE INTO coins (symbol, name) VALUES (?, ?)';
      const [result] = await connection.execute(query, [symbol, name]);
      return result;
    } finally {
      connection.release();
    }
  }
}

module.exports = {
  PriceDataModel,
  CollectionLogModel,
  SystemConfigModel,
  CoinsModel
};