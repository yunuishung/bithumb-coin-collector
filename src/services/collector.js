const BithumbAPI = require('../api/bithumb');
const { PriceDataModel, CollectionLogModel } = require('../database/models');
const logger = require('../utils/logger');

class DataCollector {
  constructor() {
    this.api = new BithumbAPI();
    this.isRunning = false;
    this.intervals = new Map();
    this.stats = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      lastCollectionTime: null,
      startTime: new Date()
    };
  }

  async start(symbols, interval = 60000) {
    if (this.isRunning) {
      logger.warn('데이터 수집이 이미 실행 중입니다.');
      return;
    }

    this.isRunning = true;
    logger.info(`데이터 수집 시작: ${symbols.join(', ')} (간격: ${interval}ms)`);

    for (const symbol of symbols) {
      this.startSymbolCollection(symbol, interval);
    }

    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  startSymbolCollection(symbol, interval) {
    const collect = async () => {
      const startTime = Date.now();
      try {
        await this.collectPriceData(symbol);
        this.stats.successfulCollections++;
        
        const executionTime = Date.now() - startTime;
        await CollectionLogModel.insert({
          symbol,
          status: 'success',
          message: `${symbol} 데이터 수집 완료`,
          execution_time: executionTime
        });

      } catch (error) {
        this.stats.failedCollections++;
        logger.error(`${symbol} 데이터 수집 실패:`, error);
        
        await CollectionLogModel.insert({
          symbol,
          status: 'error',
          message: `${symbol} 데이터 수집 실패: ${error.message}`,
          error_details: {
            stack: error.stack,
            message: error.message
          },
          execution_time: Date.now() - startTime
        });
      }
      
      this.stats.totalCollections++;
      this.stats.lastCollectionTime = new Date();
    };

    collect();
    const intervalId = setInterval(collect, interval);
    this.intervals.set(symbol, intervalId);
    
    logger.info(`${symbol} 데이터 수집 스케줄러 시작됨 (간격: ${interval}ms)`);
  }

  async collectPriceData(symbol) {
    logger.debug(`${symbol} 가격 데이터 수집 시작`);
    
    const tickerData = await this.api.getTicker(symbol);
    const priceData = this.api.parsePriceData(tickerData, symbol);
    
    await PriceDataModel.insert(priceData);
    
    logger.debug(`${symbol} 가격 데이터 저장 완료: ₩${priceData.closing_price}`);
    
    return priceData;
  }

  async collectAllCoinsOnce() {
    try {
      logger.info('전체 코인 데이터 일회 수집 시작');
      const allTickers = await this.api.getAllTickers();
      const results = [];

      for (const [symbol, tickerData] of Object.entries(allTickers)) {
        if (symbol === 'date') continue;
        
        try {
          const priceData = this.api.parsePriceData(tickerData, symbol);
          await PriceDataModel.insert(priceData);
          results.push({ symbol, status: 'success', price: priceData.closing_price });
          
          logger.debug(`${symbol} 저장 완료: ₩${priceData.closing_price}`);
        } catch (error) {
          logger.error(`${symbol} 처리 실패:`, error);
          results.push({ symbol, status: 'error', error: error.message });
        }
      }

      logger.info(`전체 코인 데이터 수집 완료: 성공 ${results.filter(r => r.status === 'success').length}개, 실패 ${results.filter(r => r.status === 'error').length}개`);
      return results;

    } catch (error) {
      logger.error('전체 코인 데이터 수집 실패:', error);
      throw error;
    }
  }

  stop(symbol = null) {
    if (symbol) {
      const intervalId = this.intervals.get(symbol);
      if (intervalId) {
        clearInterval(intervalId);
        this.intervals.delete(symbol);
        logger.info(`${symbol} 데이터 수집 중지됨`);
      }
    } else {
      for (const [sym, intervalId] of this.intervals.entries()) {
        clearInterval(intervalId);
        logger.info(`${sym} 데이터 수집 중지됨`);
      }
      this.intervals.clear();
      this.isRunning = false;
      logger.info('모든 데이터 수집이 중지됨');
    }
  }

  async gracefulShutdown() {
    logger.info('데이터 수집 서비스 종료 중...');
    this.stop();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('데이터 수집 서비스가 정상적으로 종료되었습니다.');
    process.exit(0);
  }

  getStats() {
    return {
      ...this.stats,
      activeSymbols: Array.from(this.intervals.keys()),
      uptime: Date.now() - this.stats.startTime.getTime(),
      successRate: this.stats.totalCollections > 0 
        ? (this.stats.successfulCollections / this.stats.totalCollections * 100).toFixed(2)
        : 0
    };
  }

  async healthCheck() {
    try {
      const serverStatus = await this.api.getServerStatus();
      const dbConnection = require('../config/database');
      await dbConnection.testConnection();
      
      return {
        api: serverStatus,
        database: true,
        collector: this.isRunning,
        stats: this.getStats()
      };
    } catch (error) {
      logger.error('Health check 실패:', error);
      return {
        api: false,
        database: false,
        collector: this.isRunning,
        error: error.message
      };
    }
  }
}

module.exports = DataCollector;