# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

빗썸 API 기반 실시간 코인 데이터 수집 및 MySQL 저장 시스템. Node.js CLI 애플리케이션으로 PM2 데몬 프로세스 관리 지원.

## Key Commands

### Development & Testing
```bash
# Install dependencies
npm install

# Database setup (required first time)
npm run db-setup

# Development with hot reload
npm run dev

# Run tests and linting
npm test
npm run lint

# API connection test
npm start -- test-api -s BTC

# Database connection test  
npm start -- db-test
```

### Production Operations
```bash
# Start data collection (foreground)
npm start -- collect -s BTC,ETH,XRP -i 60000

# Start daemon with PM2
npm run daemon

# Check daemon status
npm run daemon-status

# View logs
npm run daemon-logs

# Stop daemon
npm run daemon-stop
```

### Data Management
```bash
# Collect all coins once
npm start -- collect --once

# Check collector status
npm start -- status

# View collection logs
npm start -- logs -l 50 --errors

# View collected data
npm start -- data -s BTC -l 10
```

## Architecture

### Core Components
- **BithumbAPI** (`src/api/bithumb.js`): HTTP client with retry logic, rate limiting, error handling
- **DataCollector** (`src/services/collector.js`): Main collection service with interval scheduling
- **Database Models** (`src/database/models.js`): MySQL data access layer with connection pooling
- **Logger** (`src/utils/logger.js`): Winston-based rotating file logging with multiple levels

### Data Flow
1. CLI → DataCollector.start(symbols, interval)
2. DataCollector → BithumbAPI.getTicker(symbol) 
3. BithumbAPI → Parse response → PriceDataModel.insert()
4. CollectionLogModel.insert() for audit trail
5. Winston logger for all operations

### Database Schema
- `price_data`: Real-time ticker data with indexes on symbol+collected_at
- `collection_logs`: Audit trail with execution times and error details
- `coins`: Supported coin metadata
- `system_config`: Runtime configuration key-value store

## Configuration

### Environment Variables (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=bithumb_data
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_INTERVAL=60000
MAX_RETRIES=3
```

### PM2 Configuration (ecosystem.config.js)
- Auto-restart on crash
- Memory limit: 1GB
- Daily cron restart at 3 AM
- Log rotation with timestamps
- Graceful shutdown with 5s kill timeout

## Error Handling

### API Errors
- Exponential backoff retry (max 3 attempts)
- Network timeout: 10 seconds
- Rate limit awareness
- Circuit breaker pattern for server issues

### Database Errors
- Connection pool with 10 max connections
- Automatic reconnection
- Transaction rollback on failures
- Detailed error logging with stack traces

### Process Management
- Graceful shutdown on SIGINT/SIGTERM
- PM2 health monitoring
- Memory leak protection
- Automatic restart on failure

## Development Patterns

### Adding New Commands
1. Add command in `src/index.js` using Commander.js
2. Implement business logic in appropriate service
3. Add database operations in models if needed
4. Include comprehensive error handling and logging

### Database Changes
1. Update `src/database/schema.sql`
2. Add/modify models in `src/database/models.js`
3. Update `scripts/setup-database.js` if needed
4. Test with `npm run db-setup`

### API Extensions
1. Add methods to `src/api/bithumb.js`
2. Follow existing retry and error handling patterns
3. Add request/response logging
4. Update data parsing in `parsePriceData()`

## Monitoring & Troubleshooting

### Log Locations
- Application: `logs/application-YYYY-MM-DD.log`
- Errors: `logs/error-YYYY-MM-DD.log`
- PM2: `logs/pm2-*.log`

### Health Check Endpoints
- `npm start -- status`: Full system status
- Database logs: `CollectionLogModel.getRecentLogs()`
- API status: `BithumbAPI.getServerStatus()`

### Common Issues
- Database connection: Check MySQL service and credentials
- API failures: Check bithumb.com status and network
- Memory leaks: Monitor PM2 restart frequency
- Disk space: Log rotation settings in logger config