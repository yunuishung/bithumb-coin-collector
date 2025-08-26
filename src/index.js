#!/usr/bin/env node

const { Command } = require('commander');
const DataCollector = require('./services/collector');
const { testConnection } = require('./config/database');
const { PriceDataModel, CollectionLogModel } = require('./database/models');
const logger = require('./utils/logger');
const packageJson = require('../package.json');

const program = new Command();
const collector = new DataCollector();

program
  .name('coin-collector')
  .description('빗썸 API 코인 데이터 수집기')
  .version(packageJson.version);

program
  .command('collect')
  .description('코인 데이터 수집 시작')
  .option('-s, --symbols <symbols>', '수집할 코인 심볼들 (쉼표로 구분)', 'BTC,ETH,XRP')
  .option('-i, --interval <ms>', '수집 간격 (밀리초)', '60000')
  .option('-d, --daemon', '데몬 모드로 실행', false)
  .option('--once', '한 번만 수집하고 종료', false)
  .action(async (options) => {
    try {
      logger.info('데이터베이스 연결 확인 중...');
      await testConnection();
      logger.info('데이터베이스 연결 성공');

      const symbols = options.symbols.split(',').map(s => s.trim().toUpperCase());
      const interval = parseInt(options.interval);

      if (options.once) {
        logger.info('일회성 전체 코인 데이터 수집 시작');
        const results = await collector.collectAllCoinsOnce();
        logger.info('수집 완료:', results.length);
        process.exit(0);
      } else {
        if (options.daemon) {
          logger.info('데몬 모드로 실행');
          process.title = 'coin-collector-daemon';
        }

        await collector.start(symbols, interval);
      }
    } catch (error) {
      logger.error('수집 시작 실패:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('수집기 상태 확인')
  .action(async () => {
    try {
      const health = await collector.healthCheck();
      const stats = collector.getStats();
      
      console.log('\n=== 빗썸 코인 데이터 수집기 상태 ===');
      console.log(`API 상태: ${health.api ? '✓ 정상' : '✗ 오류'}`);
      console.log(`데이터베이스 상태: ${health.database ? '✓ 정상' : '✗ 오류'}`);
      console.log(`수집기 상태: ${health.collector ? '✓ 실행중' : '✗ 중지됨'}`);
      console.log(`활성 심볼: ${stats.activeSymbols.join(', ') || '없음'}`);
      console.log(`총 수집 횟수: ${stats.totalCollections}`);
      console.log(`성공률: ${stats.successRate}%`);
      console.log(`가동 시간: ${Math.floor(stats.uptime / 1000)}초`);
      console.log(`마지막 수집: ${stats.lastCollectionTime || '없음'}\n`);
      
    } catch (error) {
      logger.error('상태 확인 실패:', error);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('수집 로그 조회')
  .option('-l, --limit <number>', '조회할 로그 수', '20')
  .option('-e, --errors', '에러 로그만 조회', false)
  .option('-s, --symbol <symbol>', '특정 심볼의 로그만 조회')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit);
      let logs;
      
      if (options.errors) {
        logs = await CollectionLogModel.getErrorLogs(options.symbol, limit);
      } else {
        logs = await CollectionLogModel.getRecentLogs(limit);
      }

      console.log('\n=== 수집 로그 ===');
      logs.forEach(log => {
        const status = log.status === 'success' ? '✓' : '✗';
        console.log(`${log.collected_at} [${status}] ${log.symbol}: ${log.message}`);
        if (log.execution_time) {
          console.log(`  실행시간: ${log.execution_time}ms`);
        }
      });
      console.log();

    } catch (error) {
      logger.error('로그 조회 실패:', error);
      process.exit(1);
    }
  });

program
  .command('data')
  .description('수집된 데이터 조회')
  .option('-s, --symbol <symbol>', '조회할 코인 심볼', 'BTC')
  .option('-l, --limit <number>', '조회할 데이터 수', '10')
  .action(async (options) => {
    try {
      const symbol = options.symbol.toUpperCase();
      const limit = parseInt(options.limit);
      
      const data = await PriceDataModel.getLatest(symbol, limit);
      
      console.log(`\n=== ${symbol} 최근 데이터 ===`);
      data.forEach(item => {
        console.log(`${item.collected_at}: ₩${item.closing_price} (거래량: ${item.units_traded})`);
      });
      console.log();

    } catch (error) {
      logger.error('데이터 조회 실패:', error);
      process.exit(1);
    }
  });

program
  .command('test-api')
  .description('빗썸 API 연결 테스트')
  .option('-s, --symbol <symbol>', '테스트할 코인 심볼', 'BTC')
  .action(async (options) => {
    try {
      const BithumbAPI = require('./api/bithumb');
      const api = new BithumbAPI();
      const symbol = options.symbol.toUpperCase();

      console.log('빗썸 API 연결 테스트 중...');
      const ticker = await api.getTicker(symbol);
      const priceData = api.parsePriceData(ticker, symbol);

      console.log('\n=== API 테스트 결과 ===');
      console.log(`심볼: ${symbol}`);
      console.log(`현재가: ₩${priceData.closing_price}`);
      console.log(`시가: ₩${priceData.opening_price}`);
      console.log(`고가: ₩${priceData.max_price}`);
      console.log(`저가: ₩${priceData.min_price}`);
      console.log(`거래량: ${priceData.units_traded}`);
      console.log('✓ API 연결 성공\n');

    } catch (error) {
      logger.error('API 테스트 실패:', error);
      console.log('✗ API 연결 실패');
      process.exit(1);
    }
  });

program
  .command('db-test')
  .description('데이터베이스 연결 테스트')
  .action(async () => {
    try {
      console.log('데이터베이스 연결 테스트 중...');
      await testConnection();
      console.log('✓ 데이터베이스 연결 성공');
    } catch (error) {
      logger.error('데이터베이스 연결 실패:', error);
      console.log('✗ 데이터베이스 연결 실패');
      process.exit(1);
    }
  });

if (require.main === module) {
  program.parse();
}

module.exports = { program, collector };