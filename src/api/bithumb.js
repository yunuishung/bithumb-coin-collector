const axios = require('axios');
const logger = require('../utils/logger');

class BithumbAPI {
  constructor() {
    this.baseURL = process.env.BITHUMB_API_URL || 'https://api.bithumb.com';
    this.timeout = parseInt(process.env.API_REQUEST_TIMEOUT) || 10000;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY) || 5000;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'bithumb-coin-collector/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API 요청: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API 요청 에러:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`API 응답: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`API 응답 에러: ${error.response.status} ${error.response.data}`);
        } else if (error.request) {
          logger.error('API 네트워크 에러:', error.message);
        } else {
          logger.error('API 설정 에러:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryRequest(requestFn, retries = this.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await requestFn();
        if (attempt > 1) {
          logger.info(`API 요청 성공 (${attempt}/${retries} 시도)`);
        }
        return result;
      } catch (error) {
        logger.warn(`API 요청 실패 (${attempt}/${retries} 시도): ${error.message}`);
        
        if (attempt === retries) {
          throw error;
        }
        
        await this.sleep(this.retryDelay * attempt);
      }
    }
  }

  async getTicker(symbol) {
    const requestFn = async () => {
      const response = await this.client.get(`/public/ticker/${symbol}_KRW`);
      
      if (response.data.status !== '0000') {
        throw new Error(`API 에러: ${response.data.message || 'Unknown error'}`);
      }
      
      return response.data.data;
    };

    return await this.retryRequest(requestFn);
  }

  async getAllTickers() {
    const requestFn = async () => {
      const response = await this.client.get('/public/ticker/ALL_KRW');
      
      if (response.data.status !== '0000') {
        throw new Error(`API 에러: ${response.data.message || 'Unknown error'}`);
      }
      
      return response.data.data;
    };

    return await this.retryRequest(requestFn);
  }

  async getOrderbook(symbol, count = 5) {
    const requestFn = async () => {
      const response = await this.client.get(`/public/orderbook/${symbol}_KRW`, {
        params: { count }
      });
      
      if (response.data.status !== '0000') {
        throw new Error(`API 에러: ${response.data.message || 'Unknown error'}`);
      }
      
      return response.data.data;
    };

    return await this.retryRequest(requestFn);
  }

  async getTransactionHistory(symbol, count = 20) {
    const requestFn = async () => {
      const response = await this.client.get(`/public/transaction_history/${symbol}_KRW`, {
        params: { count }
      });
      
      if (response.data.status !== '0000') {
        throw new Error(`API 에러: ${response.data.message || 'Unknown error'}`);
      }
      
      return response.data.data;
    };

    return await this.retryRequest(requestFn);
  }

  async getCandlestick(symbol, chart_intervals = '24h') {
    const requestFn = async () => {
      const response = await this.client.get(`/public/candlestick/${symbol}_KRW/${chart_intervals}`);
      
      if (response.data.status !== '0000') {
        throw new Error(`API 에러: ${response.data.message || 'Unknown error'}`);
      }
      
      return response.data.data;
    };

    return await this.retryRequest(requestFn);
  }

  async getServerStatus() {
    try {
      const response = await this.client.get('/public/ticker/BTC_KRW');
      return response.data.status === '0000';
    } catch (error) {
      return false;
    }
  }

  parsePriceData(tickerData, symbol) {
    if (!tickerData) {
      throw new Error('빈 ticker 데이터');
    }

    return {
      symbol: symbol,
      opening_price: parseFloat(tickerData.opening_price) || null,
      closing_price: parseFloat(tickerData.closing_price) || null,
      min_price: parseFloat(tickerData.min_price) || null,
      max_price: parseFloat(tickerData.max_price) || null,
      units_traded: parseFloat(tickerData.units_traded) || null,
      acc_trade_value: parseFloat(tickerData.acc_trade_value) || null,
      prev_closing_price: parseFloat(tickerData.prev_closing_price) || null,
      units_traded_24H: parseFloat(tickerData.units_traded_24H) || null,
      acc_trade_value_24H: parseFloat(tickerData.acc_trade_value_24H) || null,
      fluctate_24H: parseFloat(tickerData.fluctate_24H) || null,
      fluctate_rate_24H: parseFloat(tickerData.fluctate_rate_24H) || null
    };
  }
}

module.exports = BithumbAPI;