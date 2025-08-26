-- 빗썸 코인 데이터 수집 데이터베이스 스키마

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS bithumb_data CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bithumb_data;

-- 코인 정보 테이블
CREATE TABLE IF NOT EXISTS coins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE COMMENT '코인 심볼 (예: BTC, ETH)',
  name VARCHAR(100) NOT NULL COMMENT '코인 이름',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_symbol (symbol)
) COMMENT '코인 기본 정보';

-- 실시간 시세 데이터 테이블
CREATE TABLE IF NOT EXISTS price_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL COMMENT '코인 심볼',
  opening_price DECIMAL(20, 8) COMMENT '시가',
  closing_price DECIMAL(20, 8) COMMENT '종가',
  min_price DECIMAL(20, 8) COMMENT '최저가',
  max_price DECIMAL(20, 8) COMMENT '최고가',
  units_traded DECIMAL(20, 8) COMMENT '거래량',
  acc_trade_value DECIMAL(20, 2) COMMENT '누적 거래금액',
  prev_closing_price DECIMAL(20, 8) COMMENT '전일 종가',
  units_traded_24h DECIMAL(20, 8) COMMENT '24시간 거래량',
  acc_trade_value_24h DECIMAL(20, 2) COMMENT '24시간 누적 거래금액',
  fluctate_24h DECIMAL(20, 8) COMMENT '24시간 변동량',
  fluctate_rate_24h DECIMAL(8, 4) COMMENT '24시간 변동률',
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 수집 시간',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_collected (symbol, collected_at),
  INDEX idx_collected_at (collected_at),
  INDEX idx_symbol (symbol)
) COMMENT '실시간 시세 데이터';

-- 데이터 수집 로그 테이블
CREATE TABLE IF NOT EXISTS collection_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL COMMENT '수집 대상 코인 심볼',
  status ENUM('success', 'error', 'warning') NOT NULL COMMENT '수집 상태',
  message TEXT COMMENT '로그 메시지',
  error_details JSON COMMENT '에러 상세 정보',
  execution_time INT COMMENT '실행 시간 (밀리초)',
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '수집 시간',
  INDEX idx_symbol_status (symbol, status),
  INDEX idx_collected_at (collected_at),
  INDEX idx_status (status)
) COMMENT '데이터 수집 로그';

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '설정 키',
  config_value TEXT NOT NULL COMMENT '설정 값',
  description TEXT COMMENT '설정 설명',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_config_key (config_key)
) COMMENT '시스템 설정';

-- 기본 코인 데이터 삽입
INSERT IGNORE INTO coins (symbol, name) VALUES 
('BTC', 'Bitcoin'),
('ETH', 'Ethereum'),
('XRP', 'Ripple'),
('ADA', 'Cardano'),
('DOT', 'Polkadot'),
('LINK', 'Chainlink'),
('LTC', 'Litecoin'),
('BCH', 'Bitcoin Cash'),
('XLM', 'Stellar'),
('DOGE', 'Dogecoin');

-- 기본 시스템 설정 삽입
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES
('default_collection_interval', '60000', '기본 데이터 수집 간격 (밀리초)'),
('max_retries', '3', '최대 재시도 횟수'),
('retry_delay', '5000', '재시도 지연 시간 (밀리초)'),
('api_timeout', '10000', 'API 요청 타임아웃 (밀리초)');