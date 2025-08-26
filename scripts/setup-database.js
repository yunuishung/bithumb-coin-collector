#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('데이터베이스 연결 중...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('스키마 파일 읽는 중...');
    const schemaPath = path.join(__dirname, '../src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('데이터베이스 및 테이블 생성 중...');
    await connection.execute(schema);
    
    console.log('✓ 데이터베이스 설정 완료');
    
    console.log('\n=== 설정 완료 ===');
    console.log('데이터베이스: bithumb_data');
    console.log('테이블:');
    console.log('  - coins (코인 정보)');
    console.log('  - price_data (실시간 시세)');
    console.log('  - collection_logs (수집 로그)');
    console.log('  - system_config (시스템 설정)');
    console.log('\n기본 데이터가 삽입되었습니다.');
    
  } catch (error) {
    console.error('데이터베이스 설정 실패:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };